import Joi from 'joi';
declare class TableConfiguration {
    joiSchemaValidator(): Joi.ObjectSchema<any>;
}
declare const tableConfigurationValidator: TableConfiguration;
export = tableConfigurationValidator;
