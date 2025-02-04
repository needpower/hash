import { gql } from "apollo-server-express";

export const propertyTypeTypedef = gql`
  scalar PropertyType
  scalar PropertyTypeWithoutId

  type PersistedPropertyType {
    """
    The specific versioned URI of the property type
    """
    propertyTypeId: String!
    """
    The id of the account that owns this property type.
    """
    ownedById: ID!
    """
    Alias of ownedById - the id of the account that owns this property type.
    """
    accountId: ID!
      @deprecated(reason: "accountId is deprecated. Use ownedById instead.")
    """
    The property type
    """
    propertyType: PropertyType!
  }

  extend type Query {
    """
    Get a subgraph rooted at all property types at their latest version.
    """
    getAllLatestPropertyTypes(
      dataTypeResolveDepth: Int!
      propertyTypeResolveDepth: Int!
    ): Subgraph!

    """
    Get a subgraph rooted at an property type resolved by its versioned URI.
    """
    getPropertyType(
      propertyTypeId: String!
      dataTypeResolveDepth: Int!
      propertyTypeResolveDepth: Int!
    ): Subgraph!
  }

  extend type Mutation {
    """
    Create a property type.
    """
    createPropertyType(
      """
      The id of the account who owns the property type. Defaults to the user calling the mutation.
      """
      ownedById: ID
      propertyType: PropertyTypeWithoutId!
    ): PersistedPropertyType!

    """
    Update a property type.
    """
    updatePropertyType(
      """
      The property type versioned $id to update.
      """
      propertyTypeId: String!
      """
      New property type schema contents to be used.
      """
      updatedPropertyType: PropertyTypeWithoutId!
    ): PersistedPropertyType!
  }
`;
