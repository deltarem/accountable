from accountable import company
from accountable.crm import tables
from alembic import context

# Importing a module is what puts its tables in the metadata they share: tables
# for the records, which imports users for its foreign keys, and company for the
# company settings. Batch mode is on because SQLite can only make most table
# changes by rebuilding the table.
metadata = tables.metadata
assert company.company_settings.metadata is metadata

if context.is_offline_mode():
    # Writes out the SQL for the database the URL names, which needs no database.
    context.configure(
        url=context.config.get_main_option("sqlalchemy.url"),
        literal_binds=True,
        target_metadata=metadata,
        render_as_batch=True,
    )
else:
    # db.py hands over an open connection and owns its transaction.
    context.configure(
        connection=context.config.attributes["connection"],
        target_metadata=metadata,
        render_as_batch=True,
    )

with context.begin_transaction():
    context.run_migrations()
