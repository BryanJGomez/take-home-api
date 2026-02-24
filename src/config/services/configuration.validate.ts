import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ArgumentInvalidException } from '../../common/argument-invalid.exception';
import { validationErrorsToString } from '../../utils/';
import { ConfigurationEnv } from '../envs/configuration.env';

export function ConfigurationValidate(
  config: Record<string, unknown>,
): ConfigurationEnv {
  const validatedConfig = plainToClass(ConfigurationEnv, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new ArgumentInvalidException(validationErrorsToString(errors));
  }

  return validatedConfig;
}
