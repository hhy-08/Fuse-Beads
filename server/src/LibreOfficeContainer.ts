/**
 * LibreOffice 容器 Durable Object 封装
 * 将转换请求转发到容器内 HTTP 服务
 */
import { Container } from '@cloudflare/containers'

/**
 * LibreOffice 转换容器
 * 默认监听 8080，空闲 10 分钟后休眠
 */
export class LibreOfficeContainer extends Container {
  defaultPort = 8080
  requiredPorts = [8080]
  sleepAfter = '10m'
  enableInternet = false
  pingEndpoint = '/health'
}
