/**
 * imagetracerjs 类型声明
 */
declare module 'imagetracerjs' {
  type TraceOptions = Record<string, unknown>

  type ImageTracerApi = {
    imagedataToSVG: (
      imageData: ImageData,
      options?: string | TraceOptions,
    ) => string
    imageToSVG: (
      url: string,
      callback: (svg: string) => void,
      options?: string | TraceOptions,
    ) => void
    optionpresets: Record<string, TraceOptions>
  }

  const ImageTracer: ImageTracerApi
  export default ImageTracer
}
