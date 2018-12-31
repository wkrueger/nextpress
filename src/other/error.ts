export function formatError(err: any): { error: { message: string } & Record<string, any> } {
  let axiosError: any = err && err.response && err.response.data && err.response.data.error

  if (axiosError) {
    return formatError(axiosError)
  }
  if (err.message) {
    return { error: { message: err.message, ...err } }
  }
  if (err.error) {
    return formatError(err.error)
  }
  return { error: { message: String(err) } }
}
