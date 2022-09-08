//! Web routes for CRU operations on Data Types.

use std::sync::Arc;

use axum::{
    extract::Path,
    http::StatusCode,
    routing::{get, post},
    Extension, Json, Router,
};
use error_stack::IntoReport;
use serde::{Deserialize, Serialize};
use type_system::{uri::VersionedUri, DataType};
use utoipa::{Component, OpenApi};

use super::api_resource::RoutedResource;
use crate::{
    api::rest::read_from_store,
    ontology::{AccountId, PersistedDataType, PersistedOntologyIdentifier},
    store::{
        query::Expression, BaseUriAlreadyExists, BaseUriDoesNotExist, DataTypeStore, StorePool,
    },
};

#[derive(OpenApi)]
#[openapi(
    handlers(
        create_data_type,
        get_data_types_by_query,
        get_data_type,
        get_latest_data_types,
        update_data_type
    ),
    components(
        CreateDataTypeRequest,
        UpdateDataTypeRequest,
        AccountId,
        PersistedOntologyIdentifier,
        PersistedDataType,
    ),
    tags(
        (name = "DataType", description = "Data Type management API")
    )
)]
pub struct DataTypeResource;

impl RoutedResource for DataTypeResource {
    /// Create routes for interacting with data types.
    fn routes<P: StorePool + Send + 'static>() -> Router {
        // TODO: The URL format here is preliminary and will have to change.
        Router::new().nest(
            "/data-types",
            Router::new()
                .route(
                    "/",
                    post(create_data_type::<P>)
                        .get(get_latest_data_types::<P>)
                        .put(update_data_type::<P>),
                )
                .route("/query", post(get_data_types_by_query::<P>))
                .route("/:version_id", get(get_data_type::<P>)),
        )
    }
}

#[derive(Serialize, Deserialize, Component)]
#[serde(rename_all = "camelCase")]
struct CreateDataTypeRequest {
    #[component(value_type = VAR_DATA_TYPE)]
    schema: serde_json::Value,
    account_id: AccountId,
}

#[utoipa::path(
    post,
    path = "/data-types",
    request_body = CreateDataTypeRequest,
    tag = "DataType",
    responses(
        (status = 201, content_type = "application/json", description = "The schema of the created data type", body = PersistedOntologyIdentifier),
        (status = 422, content_type = "text/plain", description = "Provided request body is invalid"),

        (status = 409, description = "Unable to create data type in the store as the base data type URI already exists"),
        (status = 500, description = "Store error occurred"),
    ),
    request_body = CreateDataTypeRequest,
)]
async fn create_data_type<P: StorePool + Send>(
    body: Json<CreateDataTypeRequest>,
    pool: Extension<Arc<P>>,
) -> Result<Json<PersistedOntologyIdentifier>, StatusCode> {
    let Json(CreateDataTypeRequest { schema, account_id }) = body;

    let mut store = pool.acquire().await.map_err(|report| {
        tracing::error!(error=?report, "Could not acquire store");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let data_type: DataType = schema.try_into().into_report().map_err(|report| {
        tracing::error!(error=?report, "Couldn't convert schema to Property Type");
        StatusCode::UNPROCESSABLE_ENTITY
        // TODO - We should probably return more information to the client
        //  https://app.asana.com/0/1201095311341924/1202574350052904/f
    })?;

    store
        .create_data_type(data_type, account_id)
        .await
        .map_err(|report| {
            // TODO: consider adding the data type, or at least its URI in the trace
            tracing::error!(error=?report, "Could not create data type");

            if report.contains::<BaseUriAlreadyExists>() {
                return StatusCode::CONFLICT;
            }

            // Insertion/update errors are considered internal server errors.
            StatusCode::INTERNAL_SERVER_ERROR
        })
        .map(Json)
}

#[utoipa::path(
    post,
    path = "/data-types/query",
    request_body = Expression,
    tag = "DataType",
    responses(
        (status = 200, content_type = "application/json", description = "List of all data types matching the provided query", body = [PersistedDataType]),

        (status = 422, content_type = "text/plain", description = "Provided query is invalid"),
        (status = 500, description = "Store error occurred"),
    )
)]
async fn get_data_types_by_query<P: StorePool + Send>(
    pool: Extension<Arc<P>>,
    Json(expression): Json<Expression>,
) -> Result<Json<Vec<PersistedDataType>>, StatusCode> {
    read_from_store(pool.as_ref(), &expression).await.map(Json)
}

#[utoipa::path(
    get,
    path = "/data-types",
    tag = "DataType",
    responses(
        (status = 200, content_type = "application/json", description = "List of all data types at their latest versions", body = [PersistedDataType]),

        (status = 500, description = "Store error occurred"),
    )
)]
async fn get_latest_data_types<P: StorePool + Send>(
    pool: Extension<Arc<P>>,
) -> Result<Json<Vec<PersistedDataType>>, StatusCode> {
    read_from_store(pool.as_ref(), &Expression::for_latest_version())
        .await
        .map(Json)
}

#[utoipa::path(
    get,
    path = "/data-types/{uri}",
    tag = "DataType",
    responses(
        (status = 200, content_type = "application/json", description = "The schema of the requested data type", body = PersistedDataType),
        (status = 422, content_type = "text/plain", description = "Provided URI is invalid"),

        (status = 404, description = "Data type was not found"),
        (status = 500, description = "Store error occurred"),
    ),
    params(
        ("uri" = String, Path, description = "The URI of the data type"),
    )
)]
async fn get_data_type<P: StorePool + Send>(
    uri: Path<VersionedUri>,
    pool: Extension<Arc<P>>,
) -> Result<Json<PersistedDataType>, StatusCode> {
    read_from_store(pool.as_ref(), &Expression::for_versioned_uri(&uri.0))
        .await
        .and_then(|mut data_types| data_types.pop().ok_or(StatusCode::NOT_FOUND))
        .map(Json)
}

#[derive(Component, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateDataTypeRequest {
    #[component(value_type = VAR_DATA_TYPE)]
    schema: serde_json::Value,
    account_id: AccountId,
}

#[utoipa::path(
    put,
    path = "/data-types",
    tag = "DataType",
    responses(
        (status = 200, content_type = "application/json", description = "The schema of the updated data type", body = PersistedOntologyIdentifier),
        (status = 422, content_type = "text/plain", description = "Provided request body is invalid"),

        (status = 404, description = "Base data type ID was not found"),
        (status = 500, description = "Store error occurred"),
    ),
    request_body = UpdateDataTypeRequest,
)]
async fn update_data_type<P: StorePool + Send>(
    body: Json<UpdateDataTypeRequest>,
    pool: Extension<Arc<P>>,
) -> Result<Json<PersistedOntologyIdentifier>, StatusCode> {
    let Json(UpdateDataTypeRequest { schema, account_id }) = body;

    let mut store = pool.acquire().await.map_err(|report| {
        tracing::error!(error=?report, "Could not acquire store");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let data_type: DataType = schema.try_into().into_report().map_err(|report| {
        tracing::error!(error=?report, "Couldn't convert schema to Property Type");
        StatusCode::UNPROCESSABLE_ENTITY
        // TODO - We should probably return more information to the client
        //  https://app.asana.com/0/1201095311341924/1202574350052904/f
    })?;

    store
        .update_data_type(data_type, account_id)
        .await
        .map_err(|report| {
            tracing::error!(error=?report, "Could not update data type");

            if report.contains::<BaseUriDoesNotExist>() {
                return StatusCode::NOT_FOUND;
            }

            // Insertion/update errors are considered internal server errors.
            StatusCode::INTERNAL_SERVER_ERROR
        })
        .map(Json)
}
