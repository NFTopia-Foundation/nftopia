import json
import logging
from confluent_kafka import Consumer, KafkaException
from django.utils.dateparse import parse_datetime
from analytics.models import NFTMint, NFTSale, NFTTransfer

logger = logging.getLogger(__name__)

KAFKA_CONFIG = {
    'bootstrap.servers': 'localhost:9092',   # adjust for your infra
    'group.id': 'nftopia-analytics-consumer',
    'auto.offset.reset': 'earliest',
}

TOPIC_HANDLERS = {
    "nftopia.mints": NFTMint,
    "nftopia.sales": NFTSale,
    "nftopia.transfers": NFTTransfer,
}

def handle_event(model_class, event_data):
    """Persist incoming Kafka event into DB."""
    try:
        event_data["occurred_at"] = parse_datetime(event_data["occurred_at"])
        obj = model_class.objects.create(**event_data)
        logger.info(f"Stored {model_class.__name__} event {obj.id}")
    except Exception as e:
        logger.error(f"Error storing {model_class.__name__}: {e}")

def run_consumer():
    consumer = Consumer(KAFKA_CONFIG)
    consumer.subscribe(list(TOPIC_HANDLERS.keys()))

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                raise KafkaException(msg.error())

            topic = msg.topic()
            payload = json.loads(msg.value().decode("utf-8"))
            model_class = TOPIC_HANDLERS.get(topic)

            if model_class:
                handle_event(model_class, payload)
            else:
                logger.warning(f"No handler for topic {topic}")
    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()



# python manage.py shell_plus --command "from analytics.consumers.kafka_consumer import run_consumer; run_consumer()"
