from celery import shared_task
from celery.exceptions import MaxRetriesExceededError
from .models import ProcessedEvent
from .serializers import EventSchema

@shared_task(bind=True, max_retries=3)
def process_chain_event(self, event_data):
    try:
        # Deduplication check
        if ProcessedEvent.objects.filter(event_id=event_data['id']).exists():
            return "Duplicate event"
            
        # Schema validation
        validated = EventSchema(**event_data)
        
        # Route to specific handler
        if validated.type == 'MINT':
            process_mint.delay(validated.dict())
        elif validated.type == 'TRANSFER':
            process_transfer.delay(validated.dict())
            
        # Store processed event ID
        ProcessedEvent.objects.create(event_id=validated.id)
        
    except Exception as exc:
        try:
            self.retry(exc=exc)
        except MaxRetriesExceededError:
            log_failed_event(event_data)