use std::fmt::{self, Write};

use postgres_types::ToSql;

use crate::store::{
    postgres::query::{
        Column, Path, PostgresQueryRecord, Table, TableAlias, Transpile, WindowStatement,
    },
    query::{FilterExpression, Parameter},
};

#[derive(Debug, PartialEq, Eq, Hash)]
pub enum Function<'q> {
    Min(Expression<'q>),
    Max(Expression<'q>),
}

impl Transpile for Function<'_> {
    fn transpile(&self, fmt: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Self::Min(expression) => {
                fmt.write_str("MIN(")?;
                expression.transpile(fmt)?;
                fmt.write_char(')')
            }
            Self::Max(expression) => {
                fmt.write_str("MAX(")?;
                expression.transpile(fmt)?;
                fmt.write_char(')')
            }
        }
    }
}

/// A compiled expression in Postgres.
#[derive(Debug, PartialEq, Eq, Hash)]
pub enum Expression<'q> {
    Asterisk,
    Column(Column<'q>),
    Parameter(usize),
    Function(Box<Function<'q>>),
    Window(Box<Self>, WindowStatement<'q>),
}

impl<'q> Expression<'q> {
    pub fn from_filter_value<'f: 'q, T: PostgresQueryRecord<'q>>(
        value: &'f FilterExpression<'q, T>,
        parameters: &mut Vec<&'f dyn ToSql>,
        alias: Option<TableAlias>,
    ) -> Self {
        match value {
            FilterExpression::Path(path) => Self::Column(Column {
                table: Table {
                    name: path.terminating_table_name(),
                    alias,
                },
                access: path.column_access(),
            }),
            FilterExpression::Parameter(parameter) => {
                match parameter {
                    Parameter::Number(number) => parameters.push(number),
                    Parameter::Text(text) => parameters.push(text),
                    Parameter::Boolean(bool) => parameters.push(bool),
                }
                // Indices in Postgres are 1-based
                Self::Parameter(parameters.len())
            }
        }
    }
}

impl Transpile for Expression<'_> {
    fn transpile(&self, fmt: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Self::Asterisk => fmt.write_char('*'),
            Self::Column(column) => column.transpile(fmt),
            Self::Parameter(index) => write!(fmt, "${index}"),
            Self::Function(function) => function.transpile(fmt),
            Self::Window(expression, window) => {
                expression.transpile(fmt)?;
                fmt.write_str(" OVER (")?;
                window.transpile(fmt)?;
                fmt.write_char(')')
            }
        }
    }
}

impl Transpile for Option<Expression<'_>> {
    fn transpile(&self, fmt: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Some(value) => value.transpile(fmt),
            None => fmt.write_str("NULL"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::postgres::query::{
        test_helper::max_version_expression, DataTypeQueryField, Field,
    };

    #[test]
    fn transpile_window_expression() {
        assert_eq!(
            max_version_expression().transpile_to_string(),
            r#"MAX("type_ids"."version") OVER (PARTITION BY "type_ids"."base_uri")"#
        );
    }

    #[test]
    fn transpile_function_expression() {
        assert_eq!(
            Expression::Function(Box::new(Function::Min(Expression::Column(Column {
                table: Table {
                    name: DataTypeQueryField::Version.table_name(),
                    alias: None,
                },
                access: DataTypeQueryField::Version.column_access(),
            }))))
            .transpile_to_string(),
            r#"MIN("type_ids"."version")"#
        );
    }
}
