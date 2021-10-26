import fs from "fs";
import path from "path";

import generatedIds from "./data/generatedIds.json";

import { entityTypeJson } from "./data/systemTypeSchemas";
import {
  SYSTEM_ACCOUNT_SHORTNAME,
  SYSTEM_TYPES,
} from "../../../src/lib/config";

const now = "2021-08-19T11:00:14.588Z";

const { types } = generatedIds;
const systemAccount = generatedIds.orgs[SYSTEM_ACCOUNT_SHORTNAME];

// This generates the system types we rely on being in the system in various queries/mutations
// _EXCEPT_ the "Org" type, which is created as part of the 'system account' setup

let sqlString = "";

for (const typeName of SYSTEM_TYPES.filter(
  (name: string) => name !== "Org"
)) {
  const type = types[typeName];

  sqlString += `insert into entity_types (
  entity_type_id, account_id, name, versioned,
  created_by, created_at, metadata_updated_at
) values (
  '${type.fixedId}', '${systemAccount.fixedId}', '${typeName}', true,
  '${systemAccount.fixedId}', '${now}', '${now}'
) on conflict do nothing;
insert into entity_type_versions (
  entity_type_id, entity_type_version_id, account_id,
  properties, created_by, created_at, updated_at
) values (
  '${type.fixedId}', '${type.firstVersionId}', '${systemAccount.fixedId}',
  '${entityTypeJson(typeName)}',
  '${systemAccount.fixedId}', '${now}', '${now}'
) on conflict do nothing;
`;
}

const outputPath = path.join(__dirname, "../schema/0005_system_types.sql");
fs.writeFileSync(outputPath, sqlString);
