from confluent_kafka import Consumer, KafkaException


def consume_events(topics):
    conf = {
        "bootstrap.servers": "localhost:9092",
        "group.id": "analytics-consumer",
        "auto.offset.reset": "earliest",
    }
    consumer = Consumer(conf)

    try:
        consumer.subscribe(topics)
        print(f"👂 Listening for events on {topics} ...")

        while True:
            msg = consumer.poll(1.0)  # wait up to 1s
            if msg is None:
                continue
            if msg.error():
                print(f"⚠️ Consumer error: {msg.error()}")
                continue

            print(f"✅ Event received from {msg.topic()}: {msg.value().decode('utf-8')}")

    except KeyboardInterrupt:
        print("⏹ Stopping consumer...")

    finally:
        consumer.close()


if __name__ == "__main__":
    # Run directly from CLI
    consume_events(["nft_mints", "nft_sales", "nft_transfers"])
