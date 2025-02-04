import { gql } from "@apollo/client";

export const getEntityTypeQuery = gql`
  query getEntityType(
    $entityTypeId: String!
    $dataTypeResolveDepth: Int!
    $propertyTypeResolveDepth: Int!
    $linkTypeResolveDepth: Int!
    $entityTypeResolveDepth: Int!
  ) {
    getEntityType(
      entityTypeId: $entityTypeId
      dataTypeResolveDepth: $dataTypeResolveDepth
      propertyTypeResolveDepth: $propertyTypeResolveDepth
      linkTypeResolveDepth: $linkTypeResolveDepth
      entityTypeResolveDepth: $entityTypeResolveDepth
    ) {
      roots
      vertices
      edges
      depths {
        dataTypeResolveDepth
        propertyTypeResolveDepth
        linkTypeResolveDepth
        entityTypeResolveDepth
        linkTargetEntityResolveDepth
        linkResolveDepth
      }
    }
  }
`;

export const getAllLatestEntityTypesQuery = gql`
  query getAllLatestEntityTypes(
    $dataTypeResolveDepth: Int!
    $propertyTypeResolveDepth: Int!
    $linkTypeResolveDepth: Int!
    $entityTypeResolveDepth: Int!
  ) {
    getAllLatestEntityTypes(
      dataTypeResolveDepth: $dataTypeResolveDepth
      propertyTypeResolveDepth: $propertyTypeResolveDepth
      linkTypeResolveDepth: $linkTypeResolveDepth
      entityTypeResolveDepth: $entityTypeResolveDepth
    ) {
      roots
      vertices
      edges
      depths {
        dataTypeResolveDepth
        propertyTypeResolveDepth
        linkTypeResolveDepth
        entityTypeResolveDepth
        linkTargetEntityResolveDepth
        linkResolveDepth
      }
    }
  }
`;

export const getEntityTypeRootedSubgraphQuery = gql`
  query getEntityTypeRootedSubgraph(
    $entityTypeId: String!
    $dataTypeResolveDepth: Int!
    $propertyTypeResolveDepth: Int!
    $linkTypeResolveDepth: Int!
    $entityTypeResolveDepth: Int!
  ) {
    getEntityType(
      entityTypeId: $entityTypeId
      dataTypeResolveDepth: $dataTypeResolveDepth
      propertyTypeResolveDepth: $propertyTypeResolveDepth
      linkTypeResolveDepth: $linkTypeResolveDepth
      entityTypeResolveDepth: $entityTypeResolveDepth
    ) {
      roots
      vertices
      edges
      depths {
        dataTypeResolveDepth
        propertyTypeResolveDepth
        linkTypeResolveDepth
        entityTypeResolveDepth
        linkTargetEntityResolveDepth
        linkResolveDepth
      }
    }
  }
`;

export const createEntityTypeMutation = gql`
  mutation createEntityType(
    $ownedById: ID!
    $entityType: EntityTypeWithoutId!
  ) {
    createEntityType(ownedById: $ownedById, entityType: $entityType) {
      entityTypeId
      ownedById
      entityType
    }
  }
`;

export const updateEntityTypeMutation = gql`
  mutation updateEntityType(
    $entityTypeId: String!
    $updatedEntityType: EntityTypeWithoutId!
  ) {
    updateEntityType(
      entityTypeId: $entityTypeId
      updatedEntityType: $updatedEntityType
    ) {
      entityTypeId
      ownedById
      entityType
    }
  }
`;
