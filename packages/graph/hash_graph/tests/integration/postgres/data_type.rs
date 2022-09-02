use std::str::FromStr;

use type_system::DataType;

use crate::postgres::DatabaseTestWrapper;

#[tokio::test]
async fn insert() {
    let boolean_dt = DataType::from_str(crate::test_data::data_type::BOOLEAN_V1)
        .expect("could not parse data type");

    let mut database = DatabaseTestWrapper::new().await;
    let mut api = database
        .seed([], [], [], [])
        .await
        .expect("could not seed database");

    api.create_data_type(boolean_dt)
        .await
        .expect("could not create data type");
}

#[tokio::test]
async fn query() {
    let empty_list_dt = DataType::from_str(crate::test_data::data_type::EMPTY_LIST_V1)
        .expect("could not parse data type");

    let mut database = DatabaseTestWrapper::new().await;
    let mut api = database
        .seed([], [], [], [])
        .await
        .expect("could not seed database");

    api.create_data_type(empty_list_dt.clone())
        .await
        .expect("could not create data type");

    let data_type = api
        .get_data_type(empty_list_dt.id())
        .await
        .expect("could not get data type");

    assert_eq!(data_type.inner, empty_list_dt);
}

#[tokio::test]
async fn update() {
    let object_dt_v1 = DataType::from_str(crate::test_data::data_type::OBJECT_V1)
        .expect("could not parse data type");
    let object_dt_v2 = DataType::from_str(crate::test_data::data_type::OBJECT_V2)
        .expect("could not parse data type");

    let mut database = DatabaseTestWrapper::new().await;
    let mut api = database
        .seed([], [], [], [])
        .await
        .expect("could not seed database");

    api.create_data_type(object_dt_v1.clone())
        .await
        .expect("could not create data type");

    api.update_data_type(object_dt_v2.clone())
        .await
        .expect("could not update data type");

    let returned_object_dt_v1 = api
        .get_data_type(object_dt_v1.id())
        .await
        .expect("could not get property type");

    // TODO: we probably want to be testing more interesting queries, checking an update should
    //  probably use getLatestVersion
    //  https://app.asana.com/0/0/1202884883200974/f
    let returned_object_dt_v2 = api
        .get_data_type(object_dt_v2.id())
        .await
        .expect("could not get property type");

    assert_eq!(object_dt_v1, returned_object_dt_v1.inner);
    assert_eq!(object_dt_v2, returned_object_dt_v2.inner);
}
