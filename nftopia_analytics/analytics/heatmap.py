from django.http import JsonResponse
from django.views.decorators.http import require_GET
from datetime import datetime, timedelta
import pandas as pd
import plotly.express as px
import json
import numpy as np


def generate_mock_data():
    timestamps = [datetime(2023, 1, d, h) for d in range(1, 8) for h in range(24)]
    collections = [1, 2, 3, 4]

    return {
        "timestamp": timestamps * len(collections),
        "volume": [
            abs(hash(str(d) + str(h) + str(c))) % 1000
            for c in collections
            for d in range(1, 8)
            for h in range(24)
        ],
        "collection_id": [c for c in collections for _ in range(7 * 24)],
        "collection_name": [
            f"Collection {c}" for c in collections for _ in range(7 * 24)
        ],
    }


mock_data = generate_mock_data()


def create_heatmap(heatmap_df, title, x_title, y_title, color_title):
    layout_config = {
        "title": title,
        "xaxis_title": x_title,
        "yaxis_title": y_title,
        "coloraxis_colorbar": {"title": color_title},
        "hovermode": "closest",
    }

    fig = px.imshow(
        heatmap_df,
        labels={"value": color_title, "x": x_title, "y": y_title},
        color_continuous_scale="Viridis",
        aspect="auto",
    )

    fig.update_layout(**layout_config)
    fig.update_traces(
        hovertemplate=f"""
        <b>%{{y}}</b><br>
        {x_title}: %{{x}}<br>
        {color_title}: %{{z:,.2f}}
        <extra></extra>
        """
    )

    return fig


def process_time_heatmap_data(df, time_bin):
    if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
        df["timestamp"] = pd.to_datetime(df["timestamp"])

    dt_col = pd.DatetimeIndex(df["timestamp"])
    df["day_of_week"] = dt_col.day_name()
    df["hour"] = dt_col.hour

    bin_map = {
        "1h": lambda x: x,
        "4h": lambda x: (x // 4) * 4,
        "12h": lambda x: (x // 12) * 12,
    }
    df["time_bin"] = df["hour"].map(bin_map[time_bin])
    days_order = pd.CategoricalDtype(
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        ordered=True,
    )

    heatmap_data = df.pivot_table(
        index=pd.Categorical(df["day_of_week"], dtype=days_order),
        columns="time_bin",
        values="volume",
        aggfunc="sum",
        fill_value=0,
    )

    return heatmap_data


def process_collections_heatmap_data(df, time_bin):
    if not pd.api.types.is_datetime64_any_dtype(df["timestamp"]):
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    dt_col = pd.DatetimeIndex(df["timestamp"])
    df["date"] = dt_col.date
    df["hour"] = dt_col.hour

    if time_bin == "1h":
        df["period"] = df["hour"].astype(str) + ":00"
    elif time_bin == "4h":
        df["period"] = (df["hour"] // 4 * 4).astype(str) + "-"
        df["period"] += (df["hour"] // 4 * 4 + 4).astype(str) + "h"
    else:  # 12h
        df["period"] = np.where(df["hour"] < 12, "0-12h", "12-24h")

    heatmap_data = df.pivot_table(
        index="collection_name",
        columns="period",
        values="volume",
        aggfunc="sum",
        fill_value=0,
    )

    return heatmap_data


@require_GET
def volume(request):
    try:
        time_bin = request.GET.get("time_bin", "1h")
        if time_bin not in {"1h", "4h", "12h"}:
            return JsonResponse(
                {"error": "Invalid time_bin. Use 1h, 4h or 12h"}, status=400
            )
        collection_ids = request.GET.get("collection_ids", "")
        try:
            collections = (
                [int(id) for id in collection_ids.split(",") if id]
                if collection_ids
                else None
            )
        except ValueError:
            return JsonResponse(
                {"error": "collection_ids must be comma-separated numbers"}, status=400
            )

        normalize = request.GET.get("normalize", "false").lower() == "true"
        df = pd.DataFrame(mock_data)
        if collections:
            df = df[df["collection_id"].isin(collections)]

        if df.empty:
            return JsonResponse(
                {"error": "No data for the parameters provided"}, status=404
            )

        heatmap_df = process_time_heatmap_data(df, time_bin)

        heatmap_df.index = heatmap_df.index.astype(str)
        heatmap_df.columns = heatmap_df.columns.astype(str)

        if normalize:
            total = heatmap_df.sum().sum()
            if total > 0:
                heatmap_df = heatmap_df / total

        fig = create_heatmap(
            heatmap_df,
            "NFT Volume Analysis",
            "Time of day",
            "Weekday",
            "Volume" + (" Normalized" if normalize else ""),
        )

        return JsonResponse(
            {
                "status": "success",
                "data": json.loads(fig.to_json()),
                "metadata": {
                    "time_bin": time_bin,
                    "collections": collections,
                    "normalized": normalize,
                    "view_type": "time_heatmap",
                },
            }
        )

    except Exception as e:
        import logging

        logging.error(f"Error in heatmap volume: {str(e)}", exc_info=True)
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@require_GET
def collections(request):
    try:
        time_bin = request.GET.get("time_bin", "1h")
        if time_bin not in {"1h", "4h", "12h"}:
            return JsonResponse(
                {"error": "Invalid time_bin. Use 1h, 4h or 12h"}, status=400
            )

        collection_ids = request.GET.get("collection_ids", "")
        try:
            collections = (
                [int(id) for id in collection_ids.split(",") if id]
                if collection_ids
                else None
            )
        except ValueError:
            return JsonResponse(
                {"error": "collection_ids must be comma-separated numbers"}, status=400
            )

        normalize = request.GET.get("normalize", "false").lower() == "true"
        df = pd.DataFrame(mock_data)
        if collections:
            df = df[df["collection_id"].isin(collections)]

        if df.empty:
            return JsonResponse(
                {"error": "No data for the parameters provided"}, status=404
            )

        heatmap_df = process_collections_heatmap_data(df, time_bin)

        if normalize:
            total = heatmap_df.sum().sum()
            if total > 0:
                heatmap_df = heatmap_df / total
        fig = create_heatmap(
            heatmap_df,
            "Volume by Collection",
            "Time Period",
            "Collection",
            "Volume" + (" Normalized" if normalize else ""),
        )

        return JsonResponse(
            {
                "status": "success",
                "data": json.loads(fig.to_json()),
                "metadata": {
                    "time_bin": time_bin,
                    "collections": collections,
                    "normalized": normalize,
                    "view_type": "collections_heatmap",
                },
            }
        )

    except Exception as e:
        import logging

        logging.error(f"Error in heatmap collections: {str(e)}", exc_info=True)
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
