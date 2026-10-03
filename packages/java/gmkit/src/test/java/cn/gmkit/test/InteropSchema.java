package cn.gmkit.test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaLocation;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SchemaRegistryConfig;
import com.networknt.schema.dialect.Dialect;
import com.networknt.schema.dialect.Dialects;
import com.networknt.schema.keyword.DisallowUnknownKeywordFactory;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/** 仅在测试中使用成熟校验库，生产代码不依赖 JSON Schema 或 Jackson。 */
public final class InteropSchema {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Dialect DIALECT = Dialect.builder(Dialects.getDraft202012())
        .unknownKeywordFactory(DisallowUnknownKeywordFactory.getInstance()).build();

    private InteropSchema() { }

    public static void validate(Object value, Map<String, Object> schema) {
        // 独立 registry 防止同一 $id 的 schema 变异命中旧缓存；不启用类型转换。
        SchemaRegistry registry = SchemaRegistry.withDialect(DIALECT, builder -> builder
            .schemaRegistryConfig(SchemaRegistryConfig.builder()
                .formatAssertionsEnabled(false).typeLoose(false).build()));
        JsonNode constraints = MAPPER.valueToTree(schema);
        JsonNode input = MAPPER.valueToTree(value);
        Schema metaSchema = registry.getSchema(SchemaLocation.of(DIALECT.getId()));
        if (!metaSchema.validate(constraints).isEmpty()) {
            throw new IllegalArgumentException("Invalid interop schema");
        }
        Schema validator = registry.getSchema(constraints);
        if (!validator.validate(input).isEmpty()) {
            throw new IllegalArgumentException("Interop vectors do not match schema");
        }

        // uniqueItems 不能表达指定字段唯一；结构及来源规则全部交给 networknt。
        for (String field : Arrays.asList("id", "sourceId")) {
            Set<String> seen = new HashSet<>();
            for (JsonNode vector : input.get("cases")) {
                String id = vector.get(field).textValue();
                if (!seen.add(id)) throw new IllegalArgumentException("Duplicate " + field + ": " + id);
            }
        }
    }
}
