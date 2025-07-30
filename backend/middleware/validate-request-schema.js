/*
Copilot: Give me a middleware that validates the schema of query, params, and body parameters
*/

export function checkContentType(type = "application/json") {
  return (req, res, next) => {
    if (!req.is(type)) {
      return res.status(400).json({ error: "Unexpected content-type" });
    }
    next();
  };
}

export function validateRequestSchema(schemas) {
  return (req, res, next) => {
    const { querySchema, paramsSchema, bodySchema } = schemas;
    const errors = [];

    const validatePart = (part, schema, partName) => {
      if (!schema) return;

      // Check for unexpected parameters
      const schemaKeys = Object.keys(schema);
      const partKeys = Object.keys(part);
      const unexpectedKeys = partKeys.filter(
        (key) => !schemaKeys.includes(key),
      );
      unexpectedKeys.forEach((key) => {
        errors.push(`Unexpected ${partName} parameter: ${key}`);
      });

      // Validate and coerce expected parameters
      for (const [key, { required, type, coerce = false }] of Object.entries(
        schema,
      )) {
        let value = part[key];
        console.log("Coercing...");
        if (required && value === undefined) {
          errors.push(`Missing required ${partName} parameter: ${key}`);
          continue;
        }

        console.log(value, typeof value);
        if (value !== undefined) {
          if (coerce && typeof value !== type) {
            if (type === "number" && typeof value === "string") {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                part[key] = numValue; // Coerce and update the value
              } else {
                errors.push(
                  `Invalid ${partName} parameter ${key}: cannot coerce "${value}" to ${type}`,
                );
              }
            } else if (type === "boolean" && typeof value === "string") {
              if (typeof value === "string") {
                const boolValue = value.toLowerCase();
                if (boolValue === "true") req.body[key] = true;
                else if (boolValue === "false") req.body[key] = false;
                else
                  errors.push(
                    `Invalid body parameter ${key}: Cannot coerce "${value}" to boolean`,
                  );
              } else if (typeof value === "number") {
                req.body[key] = Boolean(value);
              } else if (typeof value !== "boolean") {
                errors.push(
                  `Invalid body parameter ${key}: Cannot coerce "${value}" to boolean`,
                );
              }
            } else {
              errors.push(
                `Cannot coerce ${partName} parameter ${key} to ${type}`,
              );
            }
          } else if (typeof value !== type) {
            errors.push(
              `Invalid type for ${partName} parameter ${key}: expected ${type}, got ${typeof value}`,
            );
          }
        }
      }
    };

    validatePart(req.query, querySchema, "query");
    validatePart(req.params, paramsSchema, "params");
    validatePart(req.body, bodySchema, "body");

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    next();
  };
}
