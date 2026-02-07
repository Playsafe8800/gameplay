import Joi from 'joi';
declare class TableConfiguration {
    joiSchemaValidator(): Joi.ObjectSchema<any>;
}
export declare const tableConfigurationValidator: TableConfiguration;
export {};
