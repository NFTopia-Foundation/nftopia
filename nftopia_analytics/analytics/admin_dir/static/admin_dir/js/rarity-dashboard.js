// /**
//  * Rarity Analysis Dashboard JavaScript
//  * Handles dashboard functionality, charts, and API interactions
//  */

// const RarityDashboard = {
//     // Configuration
//     config: {
//         apiBaseUrl: "/analytics/api/rarity/",
//         refreshInterval: 30000, // 30 seconds
//         chartColors: {
//             primary: "#3498db",
//             secondary: "#e74c3c",
//             success: "#27ae60",
//             warning: "#f39c12",
//             info: "#17a2b8",
//         },
//     },

//     // State
//     state: {
//         collections: [],
//         currentCollection: null,
//         refreshTimer: null,
//         charts: {},
//     },

//     // Initialize dashboard
//     init() {
//         console.log("Initializing Rarity Dashboard...");
//         this.loadDashboardData();
//         this.setupEventListeners();
//         this.startAutoRefresh();
//     },

//     // Setup event listeners
//     setupEventListeners() {
//         // Refresh analysis button
//         document
//             .getElementById("refresh-analysis")
//             .addEventListener("click", () => {
//                 this.refreshAnalysis();
//             });

//         // Export data button
//         document.getElementById("export-data").addEventListener("click", () => {
//             this.exportData();
//         });

//         // Collection selector
//         document
//             .getElementById("collection-selector")
//             .addEventListener("change", (e) => {
//                 this.onCollectionChange(e.target.value);
//             });

//         // Correlation collection selector
//         document
//             .getElementById("correlation-collection-selector")
//             .addEventListener("change", (e) => {
//                 this.onCorrelationCollectionChange(e.target.value);
//             });

//         // Refresh rarest NFTs button
//         document
//             .getElementById("refresh-rarest")
//             .addEventListener("click", () => {
//                 this.loadRarestNFTs();
//             });

//         // Modal close button
//         document.querySelector(".close").addEventListener("click", () => {
//             this.closeModal();
//         });

//         // Close modal when clicking outside
//         window.addEventListener("click", (e) => {
//             if (e.target.classList.contains("modal")) {
//                 this.closeModal();
//             }
//         });
//     },

//     // Load dashboard data
//     async loadDashboardData() {
//         try {
//             this.showLoading(true);

//             // Load dashboard overview
//             const dashboardResponse = await this.apiCall("dashboard/");
//             if (dashboardResponse.success) {
//                 this.updateDashboardOverview(dashboardResponse.data);
//             }

//             // Load metrics
//             const metricsResponse = await this.apiCall("metrics/");
//             if (metricsResponse.success) {
//                 this.updateMetrics(metricsResponse.data);
//             }

//             // Load recent jobs
//             this.loadRecentJobs();

//             // Load collections for selectors
//             this.loadCollections();
//         } catch (error) {
//             console.error("Error loading dashboard data:", error);
//             this.showError("Failed to load dashboard data");
//         } finally {
//             this.showLoading(false);
//         }
//     },

//     // Update dashboard overview
//     updateDashboardOverview(data) {
//         const { overview, recent_jobs, top_collections, recent_rare_nfts } =
//             data;

//         // Update overview cards
//         document.getElementById("total-collections").textContent =
//             overview.total_collections;
//         document.getElementById(
//             "analysis-coverage"
//         ).textContent = `${overview.analysis_coverage.toFixed(1)}%`;
//         document.getElementById("total-nfts-scored").textContent =
//             overview.total_nfts_scored || 0;
//         document.getElementById("avg-processing-time").textContent =
//             overview.avg_processing_time || "0.0";

//         // Update top collections
//         this.updateTopCollections(top_collections);

//         // Update recent rare NFTs
//         this.updateRecentRareNFTs(recent_rare_nfts);
//     },

//     // Update metrics
//     updateMetrics(data) {
//         const { job_metrics, performance_metrics } = data;

//         document.getElementById(
//             "job-success-rate"
//         ).textContent = `${job_metrics.success_rate.toFixed(1)}%`;
//         document.getElementById(
//             "cache-hit-ratio"
//         ).textContent = `${performance_metrics.cache_hit_ratio.toFixed(1)}%`;
//         document.getElementById("api-requests-today").textContent =
//             performance_metrics.api_requests_today;
//         document.getElementById("avg-response-time").textContent = `${
//             performance_metrics.avg_response_time || 0
//         }ms`;
//     },

//     // Load collections
//     async loadCollections() {
//         try {
//             const response = await this.apiCall("dashboard/");
//             if (response.success && response.data.overview) {
//                 this.state.collections = response.data.top_collections || [];
//                 this.populateCollectionSelectors();
//             }
//         } catch (error) {
//             console.error("Error loading collections:", error);
//         }
//     },

//     // Populate collection selectors
//     populateCollectionSelectors() {
//         const selectors = [
//             "collection-selector",
//             "correlation-collection-selector",
//         ];

//         selectors.forEach((selectorId) => {
//             const selector = document.getElementById(selectorId);
//             if (selector) {
//                 // Clear existing options
//                 selector.innerHTML =
//                     '<option value="">Select Collection</option>';

//                 // Add collection options
//                 this.state.collections.forEach((collection) => {
//                     const option = document.createElement("option");
//                     option.value = collection.collection_id;
//                     option.textContent = collection.collection_name;
//                     selector.appendChild(option);
//                 });
//             }
//         });
//     },

//     // Load recent jobs
//     async loadRecentJobs() {
//         try {
//             const response = await this.apiCall("dashboard/");
//             if (response.success && response.data.recent_jobs) {
//                 this.updateRecentJobsTable(response.data.recent_jobs);
//             }
//         } catch (error) {
//             console.error("Error loading recent jobs:", error);
//         }
//     },

//     // Update recent jobs table
//     updateRecentJobsTable(jobs) {
//         const tbody = document.querySelector("#recent-jobs-table tbody");
//         tbody.innerHTML = "";

//         jobs.forEach((job) => {
//             const row = document.createElement("tr");
//             row.innerHTML = `
//                 <td>${job.collection_name}</td>
//                 <td><span class="status-badge status-${job.status}">${
//                 job.status
//             }</span></td>
//                 <td>${this.formatDate(job.created_at)}</td>
//                 <td>${job.duration ? `${job.duration.toFixed(2)}s` : "-"}</td>
//                 <td>${job.nfts_processed}</td>
//                 <td>
//                     <button class="btn btn-sm btn-outline" onclick="RarityDashboard.viewJobDetails('${
//                         job.job_id
//                     }')">
//                         View
//                     </button>
//                 </td>
//             `;
//             tbody.appendChild(row);
//         });
//     },

//     // Update top collections
//     updateTopCollections(collections) {
//         // This could be used to populate a top collections chart or list
//         console.log("Top collections:", collections);
//     },

//     // Update recent rare NFTs
//     updateRecentRareNFTs(nfts) {
//         // This could be used to populate a recent rare NFTs list
//         console.log("Recent rare NFTs:", nfts);
//     },

//     // On collection change
//     async onCollectionChange(collectionId) {
//         if (!collectionId) return;

//         try {
//             this.showLoading(true);
//             const response = await this.apiCall(`${collectionId}/`);

//             if (response.success) {
//                 this.state.currentCollection = response.data;
//                 this.renderRarityHeatmap(response.data);
//             } else {
//                 this.showError("Failed to load collection data");
//             }
//         } catch (error) {
//             console.error("Error loading collection data:", error);
//             this.showError("Failed to load collection data");
//         } finally {
//             this.showLoading(false);
//         }
//     },

//     // On correlation collection change
//     async onCorrelationCollectionChange(collectionId) {
//         if (!collectionId) return;

//         try {
//             this.showLoading(true);
//             const response = await this.apiCall(`${collectionId}/`);

//             if (response.success) {
//                 this.renderRarityPriceCorrelation(response.data);
//             } else {
//                 this.showError("Failed to load correlation data");
//             }
//         } catch (error) {
//             console.error("Error loading correlation data:", error);
//             this.showError("Failed to load correlation data");
//         } finally {
//             this.showLoading(false);
//         }
//     },

//     // Render rarity heatmap
//     renderRarityHeatmap(data) {
//         const container = document.getElementById("rarity-heatmap");

//         // Create rarity distribution data
//         const rarityScores = data.rarest_nfts.map((nft) => nft.rarity_score);
//         const rarityRanges = this.createRarityRanges(rarityScores);

//         const heatmapData = [
//             {
//                 z: [rarityRanges],
//                 type: "heatmap",
//                 colorscale: "Viridis",
//                 showscale: true,
//             },
//         ];

//         const layout = {
//             title: "Rarity Distribution Heatmap",
//             xaxis: { title: "Rarity Score Ranges" },
//             yaxis: { title: "NFT Count" },
//         };

//         Plotly.newPlot(container, heatmapData, layout, { responsive: true });
//     },

//     // Render rarity-price correlation
//     renderRarityPriceCorrelation(data) {
//         const container = document.getElementById("rarity-price-scatter");

//         if (!data.rarity_price_correlation) {
//             container.innerHTML = "<p>No price correlation data available</p>";
//             return;
//         }

//         // Create scatter plot data
//         const scatterData = [
//             {
//                 x: data.rarest_nfts.map((nft) => nft.rarity_score),
//                 y: data.rarest_nfts.map((nft) => nft.price || 0),
//                 mode: "markers",
//                 type: "scatter",
//                 marker: {
//                     color: this.config.chartColors.primary,
//                     size: 8,
//                 },
//                 name: "Rarity vs Price",
//             },
//         ];

//         const layout = {
//             title: "Rarity-Price Correlation",
//             xaxis: { title: "Rarity Score" },
//             yaxis: { title: "Price (ETH)" },
//             showlegend: true,
//         };

//         Plotly.newPlot(container, scatterData, layout, { responsive: true });
//     },

//     // Create rarity ranges for heatmap
//     createRarityRanges(scores) {
//         const ranges = [];
//         const binSize = 10;

//         for (let i = 0; i < 100; i += binSize) {
//             const count = scores.filter(
//                 (score) => score >= i && score < i + binSize
//             ).length;
//             ranges.push(count);
//         }

//         return ranges;
//     },

//     // Load rarest NFTs
//     async loadRarestNFTs() {
//         try {
//             this.showLoading(true);
//             const response = await this.apiCall("dashboard/");

//             if (response.success && response.data.recent_rare_nfts) {
//                 this.updateRarestNFTsTable(response.data.recent_rare_nfts);
//             }
//         } catch (error) {
//             console.error("Error loading rarest NFTs:", error);
//             this.showError("Failed to load rarest NFTs");
//         } finally {
//             this.showLoading(false);
//         }
//     },

//     // Update rarest NFTs table
//     updateRarestNFTsTable(nfts) {
//         const container = document.getElementById("rarest-nfts-table");

//         const table = document.createElement("table");
//         table.className = "jobs-table";
//         table.innerHTML = `
//             <thead>
//                 <tr>
//                     <th>Rank</th>
//                     <th>Token ID</th>
//                     <th>Collection</th>
//                     <th>Rarity Score</th>
//                     <th>Percentile</th>
//                 </tr>
//             </thead>
//             <tbody>
//                 ${nfts
//                     .map(
//                         (nft) => `
//                     <tr>
//                         <td>${nft.rank}</td>
//                         <td>${nft.token_id}</td>
//                         <td>${nft.collection_name}</td>
//                         <td>${nft.rarity_score.toFixed(2)}</td>
//                         <td>${nft.percentile.toFixed(1)}%</td>
//                     </tr>
//                 `
//                     )
//                     .join("")}
//             </tbody>
//         `;

//         container.innerHTML = "";
//         container.appendChild(table);
//     },

//     // Refresh analysis
//     async refreshAnalysis() {
//         try {
//             this.showLoading(true);

//             const collectionId = document.getElementById(
//                 "collection-selector"
//             ).value;
//             if (!collectionId) {
//                 this.showError("Please select a collection first");
//                 return;
//             }

//             const response = await fetch(
//                 `${this.config.apiBaseUrl}refresh/${collectionId}/`,
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                         "X-CSRFToken": this.getCSRFToken(),
//                     },
//                 }
//             );

//             const result = await response.json();

//             if (result.success) {
//                 this.showSuccess("Analysis refresh started successfully");
//                 this.loadDashboardData();
//             } else {
//                 this.showError(
//                     result.error || "Failed to start analysis refresh"
//                 );
//             }
//         } catch (error) {
//             console.error("Error refreshing analysis:", error);
//             this.showError("Failed to refresh analysis");
//         } finally {
//             this.showLoading(false);
//         }
//     },

//     // Export data
//     exportData() {
//         const collectionId = document.getElementById(
//             "collection-selector"
//         ).value;
//         if (!collectionId) {
//             this.showError("Please select a collection first");
//             return;
//         }

//         // Create export URL
//         const exportUrl = `${this.config.apiBaseUrl}${collectionId}/?format=csv`;
//         window.open(exportUrl, "_blank");
//     },

//     // View job details
//     async viewJobDetails(jobId) {
//         try {
//             const response = await this.apiCall(`job/${jobId}/status/`);

//             if (response.success) {
//                 this.showJobDetailsModal(response.data);
//             } else {
//                 this.showError("Failed to load job details");
//             }
//         } catch (error) {
//             console.error("Error loading job details:", error);
//             this.showError("Failed to load job details");
//         }
//     },

//     // Show job details modal
//     showJobDetailsModal(jobData) {
//         const modal = document.getElementById("collection-analysis-modal");
//         const content = document.getElementById("collection-analysis-content");

//         content.innerHTML = `
//             <div class="job-details">
//                 <h4>Job Details</h4>
//                 <p><strong>Collection:</strong> ${jobData.collection_name}</p>
//                 <p><strong>Status:</strong> <span class="status-badge status-${
//                     jobData.status
//                 }">${jobData.status}</span></p>
//                 <p><strong>Created:</strong> ${this.formatDate(
//                     jobData.created_at
//                 )}</p>
//                 <p><strong>Duration:</strong> ${
//                     jobData.duration ? `${jobData.duration.toFixed(2)}s` : "-"
//                 }</p>
//                 <p><strong>NFTs Processed:</strong> ${
//                     jobData.nfts_processed
//                 }</p>
//                 <p><strong>NFTs with Scores:</strong> ${
//                     jobData.nfts_with_scores
//                 }</p>
//                 <p><strong>Errors:</strong> ${jobData.errors_count}</p>
//                 ${
//                     jobData.error_details && jobData.error_details.message
//                         ? `<p><strong>Error:</strong> ${jobData.error_details.message}</p>`
//                         : ""
//                 }
//             </div>
//         `;

//         modal.style.display = "block";
//     },

//     // Close modal
//     closeModal() {
//         const modal = document.getElementById("collection-analysis-modal");
//         modal.style.display = "none";
//     },

//     // Start auto refresh
//     startAutoRefresh() {
//         this.state.refreshTimer = setInterval(() => {
//             this.loadDashboardData();
//         }, this.config.refreshInterval);
//     },

//     // Stop auto refresh
//     stopAutoRefresh() {
//         if (this.state.refreshTimer) {
//             clearInterval(this.state.refreshTimer);
//             this.state.refreshTimer = null;
//         }
//     },

//     // API call helper
//     async apiCall(endpoint) {
//         const response = await fetch(`${this.config.apiBaseUrl}${endpoint}`);
//         return await response.json();
//     },

//     // Get CSRF token
//     getCSRFToken() {
//         return (
//             document.querySelector("[name=csrfmiddlewaretoken]")?.value ||
//             document.cookie
//                 .split("; ")
//                 .find((row) => row.startsWith("csrftoken="))
//                 ?.split("=")[1]
//         );
//     },

//     // Show loading spinner
//     showLoading(show) {
//         const spinner = document.getElementById("loading-spinner");
//         spinner.style.display = show ? "flex" : "none";
//     },

//     // Show success message
//     showSuccess(message) {
//         // You can implement a toast notification system here
//         console.log("Success:", message);
//         alert(message);
//     },

//     // Show error message
//     showError(message) {
//         // You can implement a toast notification system here
//         console.error("Error:", message);
//         alert(`Error: ${message}`);
//     },

//     // Format date
//     formatDate(dateString) {
//         return new Date(dateString).toLocaleString();
//     },
// };

// // Export for global access
// window.RarityDashboard = RarityDashboard;
