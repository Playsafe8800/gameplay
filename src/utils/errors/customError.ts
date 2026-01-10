class CustomError extends Error {
  cause: any;
  reason: any;
  retry: any;
  data: any;
  constructor(
    message: string,
    cause?: any,
    data?: any,
    reason?: any,
    retry?: any,
  ) {
    super();
    this.name = this.constructor.name;
    this.message = message;
    this.cause = cause;
    this.data = data;
    this.retry = retry;
  }
}

export = CustomError;
