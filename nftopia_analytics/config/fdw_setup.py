# config/fdw_setup.py
from django.db import connection

def configure_fdw():
    """Sets up PostgreSQL FDW for cross-service data access"""
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE EXTENSION IF NOT EXISTS postgres_fdw;
            
            -- Payment service connection
            CREATE SERVER payment_server 
            FOREIGN DATA WRAPPER postgres_fdw 
            OPTIONS (host 'payment-db', dbname 'payment_db', port '5432');
            
            -- User service connection
            CREATE SERVER user_server 
            FOREIGN DATA WRAPPER postgres_fdw 
            OPTIONS (host 'user-db', dbname 'user_db', port '5432');
            
            -- Map Django DB user to foreign servers
            CREATE USER MAPPING FOR current_user
            SERVER payment_server 
            OPTIONS (user 'payment_reader', password '${PAYMENT_DB_PASSWORD}');
            
            CREATE USER MAPPING FOR current_user
            SERVER user_server 
            OPTIONS (user 'user_reader', password '${USER_DB_PASSWORD}');
            
            -- Create foreign tables
            CREATE FOREIGN TABLE payment.transactions (
                id UUID,
                buyer_id UUID,
                seller_id UUID,
                nft_id UUID,
                auction_id UUID,
                amount NUMERIC(36,18),
                transaction_hash TEXT,
                status TEXT,
                timestamp TIMESTAMPTZ
            ) SERVER payment_server 
            OPTIONS (schema_name 'public', table_name 'transaction');
            
            CREATE FOREIGN TABLE user.nfts (
                id UUID,
                token_id TEXT,
                title TEXT,
                description TEXT,
                image_url TEXT,
                ipfs_url TEXT,
                metadata JSONB,
                price NUMERIC(36,18),
                currency TEXT,
                owner_id UUID,
                collection_id UUID,
                category_id UUID,
                is_listed BOOLEAN,
                created_at TIMESTAMPTZ,
                updated_at TIMESTAMPTZ
            ) SERVER user_server 
            OPTIONS (schema_name 'public', table_name 'nft');
        """)