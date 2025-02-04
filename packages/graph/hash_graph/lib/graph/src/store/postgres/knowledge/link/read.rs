use async_trait::async_trait;
use error_stack::{bail, Report, Result, ResultExt};
use futures::{stream, StreamExt, TryStreamExt};

use crate::{
    knowledge::PersistedLink,
    store::{
        crud,
        postgres::context::PostgresContext,
        query::{Expression, ExpressionError, Literal},
        AsClient, PostgresStore, QueryError,
    },
};

#[async_trait]
impl<C: AsClient> crud::Read<PersistedLink> for PostgresStore<C> {
    type Query<'q> = Expression;

    async fn read<'query>(
        &self,
        query: &Self::Query<'query>,
    ) -> Result<Vec<PersistedLink>, QueryError> {
        // TODO: We need to work around collecting all records before filtering
        //   related: https://app.asana.com/0/1202805690238892/1202923536131158/f
        stream::iter(self.read_all_links().await?.collect::<Vec<_>>().await)
            .try_filter_map(|record| async move {
                if let Literal::Bool(result) = query
                    .evaluate(&record, self)
                    .await
                    .change_context(QueryError)?
                {
                    Ok(result.then(|| PersistedLink::from(record)))
                } else {
                    bail!(
                        Report::new(ExpressionError)
                            .attach_printable("does not result in a boolean value")
                            .change_context(QueryError)
                    );
                }
            })
            .try_collect()
            .await
    }
}
