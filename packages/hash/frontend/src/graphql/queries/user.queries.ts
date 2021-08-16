import { gql } from "@apollo/client";

export const createUser = gql`
  mutation createUser($email: String!, $shortname: String!) {
    createUser(email: $email, shortname: $shortname) {
      __typename
      id
      createdById
      createdAt
      updatedAt
      accountId
      entityTypeId
      entityTypeVersionId
      entityTypeName
      visibility
      properties {
        shortname
        email
      }
    }
  }
`;

export const sendLoginCode = gql`
  mutation sendLoginCode($emailOrShortname: String!) {
    sendLoginCode(emailOrShortname: $emailOrShortname) {
      id
      createdAt
    }
  }
`;

export const loginWithLoginCode = gql`
  mutation loginWithLoginCode(
    $verificationId: ID!
    $verificationCode: String!
  ) {
    loginWithLoginCode(
      verificationId: $verificationId
      verificationCode: $verificationCode
    ) {
      __typename
      id
      createdById
      createdAt
      updatedAt
      accountId
      entityTypeId
      entityTypeVersionId
      entityTypeName
      visibility
      properties {
        shortname
        email
      }
    }
  }
`;

export const logout = gql`
  mutation logout {
    logout
  }
`;

export const meQuery = gql`
  query me {
    me {
      id
      createdById
      accountId
      entityTypeId
      entityTypeVersionId
      entityTypeName
      visibility
      properties {
        shortname
        email
      }
    }
  }
`;
