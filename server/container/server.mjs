/**
 * LibreOffice HTTP 转换服务
 * 接收 multipart 文件，调用 soffice 转换后返回结果
 */
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, extname, basename } from 'node:path'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const PORT = Number(process.env.PORT || 8080)
const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 50 * 1024 * 1024)

/**
 * 解析 multipart/form-data（仅取名为 file 的字段）
 * @param {import('node:http').IncomingMessage} req
 * @param {string} boundary
 * @returns {Promise<{ buffer: Buffer, fileName: string, contentType: string }>}
 */
async function ParseMultipartFile(req, boundary) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BYTES) {
      throw new Error(`文件超过限制 ${MAX_BYTES} 字节`)
    }
    chunks.push(chunk)
  }
  const body = Buffer.concat(chunks)
  const delim = Buffer.from(`--${boundary}`)
  let start = body.indexOf(delim)
  if (start < 0) {
    throw new Error('无效的 multipart 数据')
  }

  while (start >= 0) {
    const next = body.indexOf(delim, start + delim.length)
    const part = body.subarray(
      start + delim.length,
      next < 0 ? body.length : next,
    )
    start = next

    if (part.length < 4) continue
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd < 0) continue
    const headerText = part.subarray(0, headerEnd).toString('utf8')
    if (!/name="file"/i.test(headerText)) continue

    const nameMatch = headerText.match(/filename="([^"]+)"/i)
    const typeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i)
    let content = part.subarray(headerEnd + 4)
    if (content.subarray(-2).toString() === '\r\n') {
      content = content.subarray(0, content.length - 2)
    }
    if (content.subarray(-2).toString() === '--') {
      content = content.subarray(0, content.length - 2)
      if (content.subarray(-2).toString() === '\r\n') {
        content = content.subarray(0, content.length - 2)
      }
    }

    return {
      buffer: Buffer.from(content),
      fileName: nameMatch?.[1] || 'upload.bin',
      contentType: typeMatch?.[1]?.trim() || 'application/octet-stream',
    }
  }

  throw new Error('未找到名为 file 的上传字段')
}

/**
 * 调用 LibreOffice 无头转换
 * @param {Buffer} inputBuffer
 * @param {string} inputName
 * @param {string} targetExt 如 pdf / docx
 * @returns {Promise<{ buffer: Buffer, fileName: string }>}
 */
async function ConvertWithLibreOffice(inputBuffer, inputName, targetExt) {
  const workDir = await mkdtemp(join(tmpdir(), 'lo-'))
  const profileDir = join(workDir, 'profile')
  await mkdir(profileDir, { recursive: true })

  const safeBase = basename(inputName).replace(/[^\w.\u4e00-\u9fff-]+/g, '_') || 'input'
  const inputPath = join(workDir, safeBase)
  await writeFile(inputPath, inputBuffer)

  await new Promise((resolve, reject) => {
    const child = spawn(
      'soffice',
      [
        '--headless',
        '--nologo',
        '--nofirststartwizard',
        `--outdir`,
        workDir,
        '-env:UserInstallation=file://' + profileDir,
        '--convert-to',
        targetExt,
        inputPath,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let stderr = ''
    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('LibreOffice 转换超时'))
    }, 120000)
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(undefined)
      else reject(new Error(stderr || `soffice 退出码 ${code}`))
    })
  })

  const outBase = safeBase.replace(extname(safeBase), '')
  const outPath = join(workDir, `${outBase}.${targetExt}`)
  let buffer
  try {
    buffer = await readFile(outPath)
  } catch {
    const { readdir } = await import('node:fs/promises')
    const files = await readdir(workDir)
    const found = files.find((f) => f.endsWith(`.${targetExt}`))
    if (!found) {
      await rm(workDir, { recursive: true, force: true })
      throw new Error('未找到转换输出文件')
    }
    buffer = await readFile(join(workDir, found))
  }

  await rm(workDir, { recursive: true, force: true })
  return {
    buffer,
    fileName: `${outBase}.${targetExt}`,
  }
}

/**
 * 写入 JSON 响应
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {unknown} data
 */
function SendJson(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`)

    if (req.method === 'GET' && url.pathname === '/health') {
      SendJson(res, 200, { ok: true, service: 'libreoffice', id: randomUUID() })
      return
    }

    const contentType = req.headers['content-type'] || ''
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)

    if (req.method === 'POST' && url.pathname === '/convert') {
      const target = (url.searchParams.get('to') || '').toLowerCase()
      if (target !== 'pdf' && target !== 'docx') {
        SendJson(res, 400, { error: '仅支持 to=pdf 或 to=docx' })
        return
      }
      if (!boundaryMatch) {
        SendJson(res, 400, { error: '需要 multipart/form-data' })
        return
      }
      const boundary = boundaryMatch[1] || boundaryMatch[2]
      const file = await ParseMultipartFile(req, boundary)
      const result = await ConvertWithLibreOffice(file.buffer, file.fileName, target)
      const mime =
        target === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName)}"`,
        'Content-Length': result.buffer.length,
        'X-Converted-Name': encodeURIComponent(result.fileName),
      })
      res.end(result.buffer)
      return
    }

    if (req.method === 'POST' && url.pathname === '/protect') {
      if (!boundaryMatch) {
        SendJson(res, 400, { error: '需要 multipart/form-data' })
        return
      }
      const boundary = boundaryMatch[1] || boundaryMatch[2]
      const password = url.searchParams.get('password') || ''
      if (!password) {
        SendJson(res, 400, { error: 'password 不能为空' })
        return
      }
      const file = await ParseMultipartFile(req, boundary)
      const workDir = await mkdtemp(join(tmpdir(), 'qpdf-'))
      const inputPath = join(workDir, 'input.pdf')
      const outputPath = join(workDir, 'protected.pdf')
      await writeFile(inputPath, file.buffer)
      await new Promise((resolve, reject) => {
        const child = spawn(
          'qpdf',
          [
            '--encrypt',
            password,
            password,
            '256',
            '--',
            inputPath,
            outputPath,
          ],
          { stdio: ['ignore', 'pipe', 'pipe'] },
        )
        let stderr = ''
        child.stderr.on('data', (d) => {
          stderr += d.toString()
        })
        child.on('close', (code) => {
          if (code === 0) resolve(undefined)
          else reject(new Error(stderr || `qpdf 退出码 ${code}`))
        })
        child.on('error', reject)
      })
      const out = await readFile(outputPath)
      await rm(workDir, { recursive: true, force: true })
      const outName = (file.fileName.replace(/\.[^.]+$/, '') || 'protected') + '.pdf'
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(outName)}"`,
        'Content-Length': out.length,
        'X-Converted-Name': encodeURIComponent(outName),
      })
      res.end(out)
      return
    }

    SendJson(res, 404, { error: 'Not Found' })
  } catch (error) {
    console.error(error)
    SendJson(res, 500, {
      error: error instanceof Error ? error.message : '转换失败',
    })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LibreOffice converter listening on ${PORT}`)
})
