import { ErrorCodes, type ErrorCode } from "@/app/errors/error-codes";

export type ClassifiedError = {
  statusCode: number;
  code: ErrorCode;
  message: string;
};

type ErrorStrategy = {
  when: (error: Error) => boolean;
  classify: (error: Error, current: ClassifiedError) => ClassifiedError;
};

const DEFAULT_CLASSIFICATION: ClassifiedError = {
  statusCode: 500,
  code: ErrorCodes.CHAT_SEND_FAILED,
  message: "Failed to send request",
};

const STRATEGIES: ErrorStrategy[] = [
  {
    when: (err) => Boolean(err.message?.includes("Anthropic")),
    classify: (err, current) => ({
      ...current,
      message: err.message,
      statusCode: 400,
    }),
  },
  {
    when: (err) => Boolean(err.message?.includes("API key")),
    classify: (_err, current) => ({
      ...current,
      code: ErrorCodes.CHAT_API_KEY_INVALID,
      message: "API key is missing or invalid",
      statusCode: 401,
    }),
  },
  {
    when: (err) => Boolean(err.message?.includes("model")),
    classify: (_err, current) => ({
      ...current,
      code: ErrorCodes.CHAT_MODEL_NOT_FOUND,
      message: "Model does not exist or is unavailable",
      statusCode: 400,
    }),
  },
  {
    when: (err) => Boolean(err.message?.includes("配置参数")),
    classify: (_err, current) => ({
      ...current,
      code: ErrorCodes.CHAT_INVALID_CONFIG,
      message: "Invalid LLM configuration",
      statusCode: 400,
    }),
  },
  {
    when: (err) => Boolean(err.message),
    classify: (err, current) => ({
      ...current,
      message: err.message,
    }),
  },
];

export function classifyError(error: Error): ClassifiedError {
  const strategy = STRATEGIES.find((item) => item.when(error));
  return strategy
    ? strategy.classify(error, DEFAULT_CLASSIFICATION)
    : DEFAULT_CLASSIFICATION;
}
