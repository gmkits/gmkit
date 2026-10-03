import Ajv2020 from 'ajv/dist/2020.js';

type JsonObject = Record<string, any>;

// getKeyword 只返回含实现的关键词；以下声明和注释由 Draft 2020-12 定义。
const annotations = new Set([
  '$schema', '$id', '$defs', '$vocabulary', '$anchor', 'definitions',
  'title', 'description', 'default', 'examples', 'readOnly', 'writeOnly', 'deprecated',
  'contentMediaType', 'contentEncoding', 'contentSchema',
]);

// Ajv 不编译未引用的 $defs；这里只检查关键词，不解释或执行任何 schema 约束。
function rejectUnknownKeywords(schema: unknown, ajv: Ajv2020): void {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return;
  for (const [keyword, child] of Object.entries(schema)) {
    if (!annotations.has(keyword) && !ajv.getKeyword(keyword)) {
      throw new Error(`Unknown schema keyword: ${keyword}`);
    }
    if (['$defs', 'definitions', 'properties', 'patternProperties', 'dependentSchemas', 'dependencies'].includes(keyword)) {
      Object.values(child).forEach(value => rejectUnknownKeywords(value, ajv));
    } else if (['allOf', 'anyOf', 'oneOf', 'prefixItems'].includes(keyword)) {
      child.forEach((value: unknown) => rejectUnknownKeywords(value, ajv));
    } else if (['additionalProperties', 'unevaluatedProperties', 'propertyNames', 'items',
      'unevaluatedItems', 'contains', 'not', 'if', 'then', 'else', 'contentSchema'].includes(keyword)) {
      rejectUnknownKeywords(child, ajv);
    }
  }
}

export function validateInterop(root: unknown, schema: JsonObject): void {
  // 每次编译独立 schema，避免变异回归因相同 $id 命中旧缓存。
  const ajv = new Ajv2020({
    strict: false,
    strictSchema: true,
    allErrors: true,
    // Draft 2020-12 的 format 仅作注释，两端不启用格式断言。
    validateFormats: false,
  });
  const validate = ajv.compile(schema);
  rejectUnknownKeywords(schema, ajv);
  if (!validate(root)) {
    throw new Error(ajv.errorsText(validate.errors));
  }

  // uniqueItems 不能表达指定字段唯一；结构及来源规则全部交给 Ajv。
  const cases = (root as JsonObject).cases as JsonObject[];
  for (const field of ['id', 'sourceId']) {
    const seen = new Set<string>();
    for (const vector of cases) {
      if (seen.has(vector[field])) throw new Error(`Duplicate ${field}: ${vector[field]}`);
      seen.add(vector[field]);
    }
  }
}
