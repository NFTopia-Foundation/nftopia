import csv
from io import StringIO
from django.db import transaction
from django.utils import timezone
from django.db.models import Count
from django.contrib.auth import get_user_model

from .models import UserSegment, UserSegmentMembership
from nft_trading.models import Transaction, NFTHolding  

User = get_user_model()

def evaluate_segment(segment: UserSegment):
    qs    = User.objects.all()
    rules = segment.rules
    t     = segment.segment_type

    if t == "activity_level":
        min_txns = rules.get("min_txns", 0)
        qs = qs.annotate(txn_count=Count("transaction")).filter(txn_count__gte=min_txns)

    elif t == "holding_pattern":
        days   = rules.get("holding_days__gt", 0)
        cutoff = timezone.now() - timezone.timedelta(days=days)
        qs     = qs.filter(nftholding__acquired_at__lte=cutoff)

    elif t == "collection_pref":
        coll = rules.get("favorite_collection")
        qs   = qs.filter(nftholding__collection__name=coll)

    else:
        qs = User.objects.none()

    return qs.distinct()

@transaction.atomic
def refresh_segment_memberships(segment: UserSegment):
    segment.memberships.all().delete()
    users = evaluate_segment(segment)
    UserSegmentMembership.objects.bulk_create([
        UserSegmentMembership(user=u, segment=segment)
        for u in users
    ])

def export_segment_csv(segment: UserSegment) -> str:
    buf = StringIO()
    w   = csv.writer(buf)
    w.writerow(["user_id","username","joined_at"])
    for m in segment.memberships.select_related("user"):
        w.writerow([m.user.id, m.user.username, m.joined_at.isoformat()])
    return buf.getvalue()
