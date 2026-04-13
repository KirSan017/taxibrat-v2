import { PipeTransform, BadRequestException } from "@nestjs/common";
import { ZodSchema, ZodError } from "zod";

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = (result.error as ZodError).issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw new BadRequestException({ message: "Validation failed", errors });
    }
    return result.data;
  }
}
