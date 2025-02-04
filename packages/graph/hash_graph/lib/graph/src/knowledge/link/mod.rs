use std::fmt;

use serde::{Deserialize, Serialize};
use type_system::uri::VersionedUri;
use utoipa::ToSchema;

use super::EntityId;
use crate::ontology::AccountId;

/// A Link between a source and a target entity identified by [`EntityId`]s.
///
/// The link is described by a link type [`VersionedUri`].
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Link {
    source_entity_id: EntityId,
    target_entity_id: EntityId,
    #[schema(value_type = String)]
    link_type_id: VersionedUri,
    // TODO: Consider if ordering should be exposed on links as they are here. The API consumer
    //   manages indexes currently.
    //   https://app.asana.com/0/1202805690238892/1202937382769278/f
    index: Option<i32>,
}

impl Link {
    #[must_use]
    pub const fn new(
        source_entity_id: EntityId,
        target_entity_id: EntityId,
        link_type_id: VersionedUri,
        index: Option<i32>,
    ) -> Self {
        Self {
            source_entity_id,
            target_entity_id,
            link_type_id,
            index,
        }
    }

    #[must_use]
    pub const fn source_entity(&self) -> EntityId {
        self.source_entity_id
    }

    #[must_use]
    pub const fn target_entity(&self) -> EntityId {
        self.target_entity_id
    }

    #[must_use]
    pub const fn link_type_id(&self) -> &VersionedUri {
        &self.link_type_id
    }

    #[must_use]
    pub const fn index(&self) -> Option<i32> {
        self.index
    }
}

/// The metadata of a [`Link`] record.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PersistedLinkMetadata {
    // Note: this is inconsistent with `PersistedEntity` as the analog of
    // `PersistedEntityIdentifier` is encapsulated within the `Link` struct..
    owned_by_id: AccountId,
    // TODO: add versioning information -
    //   https://app.asana.com/0/1200211978612931/1203006164248577/f
    created_by_id: AccountId,
}

impl PersistedLinkMetadata {
    #[must_use]
    pub const fn new(owned_by_id: AccountId, created_by_id: AccountId) -> Self {
        Self {
            owned_by_id,
            created_by_id,
        }
    }

    #[must_use]
    pub const fn owned_by_id(&self) -> AccountId {
        self.owned_by_id
    }

    #[must_use]
    pub const fn created_by_id(&self) -> AccountId {
        self.created_by_id
    }
}

/// A record of a [`Link`] that has been persisted in the datastore, with its associated
/// metadata.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PersistedLink {
    inner: Link,
    metadata: PersistedLinkMetadata,
}

impl PersistedLink {
    #[must_use]
    pub const fn new(inner: Link, owned_by_id: AccountId, created_by_id: AccountId) -> Self {
        Self {
            inner,
            metadata: PersistedLinkMetadata::new(owned_by_id, created_by_id),
        }
    }

    #[must_use]
    pub const fn metadata(&self) -> &PersistedLinkMetadata {
        &self.metadata
    }

    #[must_use]
    pub const fn inner(&self) -> &Link {
        &self.inner
    }
}

impl fmt::Display for Link {
    fn fmt(&self, fmt: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(fmt, "{:?}", &self)
    }
}
