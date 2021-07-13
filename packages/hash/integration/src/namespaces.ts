import { GraphQLClient } from "graphql-request";

import {
  CreateUserMutationVariables,
  CreateOrgMutationVariables,
  CreateOrgMutation,
  CreateUserMutation,
} from "./graphql/autoGeneratedTypes";
import { createUser } from "./graphql/queries/user.queries";
import { createOrg } from "./graphql/queries/org.queries";

export const createUsers = async (client: GraphQLClient) => {
  const users: CreateUserMutationVariables[] = [
    {
      email: "aj@hash.ai",
      shortname: "akash",
    },
    {
      email: "c@hash.ai",
      shortname: "ciaran",
    },
    {
      email: "d@hash.ai",
      shortname: "david",
    },
    {
      email: "ef@hash.ai",
      shortname: "eadan",
    },
    {
      email: "nh@hash.ai",
      shortname: "nate",
    },
    {
      email: "mr@hash.ai",
      shortname: "marius",
    },
  ];

  const userResults = await Promise.all(
    users.map(
      async (user) => await client.request<CreateUserMutation>(createUser, user)
    )
  );

  return userResults.map((u) => u.createUser);
};

export const createOrgs = async (client: GraphQLClient) => {
  const orgs: CreateOrgMutationVariables[] = [
    {
      shortname: "hash",
    },
  ];

  const orgResults = await Promise.all(
    orgs.map(
      async (org) => await client.request<CreateOrgMutation>(createOrg, org)
    )
  );

  return orgResults.map((org) => org.createOrg);
};
