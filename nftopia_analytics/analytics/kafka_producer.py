from confluent_kafka import Producer
import json

producer_config = {
    'bootstrap.servers': 'localhost:9092',  # Kafka broker
}

producer = Producer(producer_config)

def delivery_report(err, msg):
    if err:
        print(f"❌ Message delivery failed: {err}")
    else:
        print(f"✅ Message delivered to {msg.topic()} [{msg.partition()}]")

def send_event(topic, event_data):
    payload = json.dumps(event_data)
    producer.produce(topic, payload.encode('utf-8'), callback=delivery_report)
    producer.flush()
