from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from marketplace.models import Collection
from analytics.models_dir.rarity_analysis import (
    CollectionRarityMetrics,
    RarityAnalysisJob
)
from analytics.services.rarity_service import RarityAnalysisService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Set up and initialize NFT rarity analysis system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--collection-id',
            type=int,
            help='Specific collection ID to analyze'
        )
        parser.add_argument(
            '--all-collections',
            action='store_true',
            help='Analyze all collections'
        )
        parser.add_argument(
            '--force-refresh',
            action='store_true',
            help='Force refresh existing analysis'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without executing'
        )

    def handle(self, *args, **options):
        try:
            collection_id = options.get('collection_id')
            all_collections = options.get('all_collections')
            force_refresh = options.get('force_refresh')
            dry_run = options.get('dry_run')

            if dry_run:
                self.stdout.write(
                    self.style.WARNING('DRY RUN MODE - No changes will be made')
                )

            if collection_id:
                # Analyze specific collection
                self.analyze_collection(collection_id, force_refresh, dry_run)
            elif all_collections:
                # Analyze all collections
                collections = Collection.objects.all()
                self.stdout.write(f"Found {collections.count()} collections to analyze")
                
                for collection in collections:
                    self.analyze_collection(collection.id, force_refresh, dry_run)
            else:
                # Show available collections
                collections = Collection.objects.all()
                self.stdout.write("Available collections:")
                for collection in collections:
                    self.stdout.write(f"  ID: {collection.id}, Name: {collection.name}")
                
                self.stdout.write(
                    self.style.WARNING(
                        "Use --collection-id <id> to analyze a specific collection "
                        "or --all-collections to analyze all collections"
                    )
                )

        except Exception as e:
            raise CommandError(f"Error setting up rarity analysis: {str(e)}")

    def analyze_collection(self, collection_id: int, force_refresh: bool, dry_run: bool):
        """Analyze a specific collection"""
        try:
            collection = Collection.objects.get(id=collection_id)
            self.stdout.write(f"Analyzing collection: {collection.name} (ID: {collection_id})")

            if dry_run:
                self.stdout.write(f"  Would analyze {collection.nfts.count()} NFTs")
                return

            # Initialize rarity service
            rarity_service = RarityAnalysisService()

            # Check if analysis already exists
            existing_metrics = CollectionRarityMetrics.objects.filter(collection=collection).first()
            if existing_metrics and not force_refresh:
                self.stdout.write(
                    self.style.WARNING(
                        f"Analysis already exists for {collection.name}. "
                        "Use --force-refresh to reanalyze."
                    )
                )
                return

            # Process the analysis
            self.stdout.write("  Processing rarity analysis...")
            result = rarity_service.process_collection_rarity_analysis(collection_id, force_refresh)

            if 'error' in result:
                self.stdout.write(
                    self.style.ERROR(f"Error analyzing collection: {result['error']}")
                )
                return

            # Display results
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully analyzed {collection.name}:"
                )
            )
            self.stdout.write(f"  - Total NFTs: {result.get('total_nfts', 0)}")
            self.stdout.write(f"  - NFTs with scores: {result.get('nfts_with_scores', 0)}")
            self.stdout.write(f"  - Errors: {result.get('errors_count', 0)}")
            self.stdout.write(f"  - Duration: {result.get('analysis_duration', 0):.2f}s")

        except Collection.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Collection with ID {collection_id} not found")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Error analyzing collection {collection_id}: {str(e)}")
            ) 