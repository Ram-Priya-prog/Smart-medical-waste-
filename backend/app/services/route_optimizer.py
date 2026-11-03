import math
import json
from typing import List, Dict, Any, Optional, Tuple
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

from app.services.distance import calculate_haversine_distance

AVERAGE_CITY_SPEED_KMH = 25.0 # Average urban collection speed in Salem, Tamil Nadu
SERVICE_TIME_MINUTES = 15 # Loading and biohazard manifest handover time per hospital

def estimate_travel_time_minutes(distance_km: float) -> float:
    """Estimated driving minutes at city traffic speed."""
    return (distance_km / AVERAGE_CITY_SPEED_KMH) * 60.0

def build_route_geometry(waypoints: List[Tuple[float, float]], steps_between: int = 4) -> List[List[float]]:
    """
    Interpolate smooth waypoints between stops for realistic route polyline on map.
    """
    if not waypoints:
        return []
    if len(waypoints) == 1:
        return [[waypoints[0][0], waypoints[0][1]]]
        
    line = []
    for i in range(len(waypoints) - 1):
        lat1, lng1 = waypoints[i]
        lat2, lng2 = waypoints[i + 1]
        for s in range(steps_between):
            frac = s / float(steps_between)
            # slight jitter for realistic road curvature
            curvature = math.sin(frac * math.pi) * 0.0008 if (i % 2 == 0) else -math.sin(frac * math.pi) * 0.0008
            line.append([
                round(lat1 + (lat2 - lat1) * frac + curvature, 6),
                round(lng1 + (lng2 - lng1) * frac + curvature, 6)
            ])
    # Add final point
    line.append([round(waypoints[-1][0], 6), round(waypoints[-1][1], 6)])
    return line

class ORToolsRouteOptimizer:
    """
    Google OR-Tools multi-stop Capacitated Vehicle Routing Problem with Time Windows (CVRPTW).
    Optimizes multi-stop collection sequences minimizing total distance, driving time, and biohazard transit risks.
    """

    @staticmethod
    def optimize_route(
        collector_info: Dict[str, Any],
        pickups_info: List[Dict[str, Any]],
        consider_capacity: bool = True,
        consider_time_windows: bool = True,
        return_to_depot: bool = True
    ) -> Dict[str, Any]:
        """
        Executes Google OR-Tools optimization.
        """
        if not pickups_info:
            return {
                "feasibility_status": "Infeasible",
                "feasibility_notes": "No pickup requests selected for route planning.",
                "stops": [],
                "total_distance_km": 0.0,
                "total_duration_minutes": 0.0,
                "total_waste_kg": 0.0,
                "capacity_utilization_pct": 0.0,
                "route_geometry": []
            }

        # Check vehicle capacity constraint upfront for immediate transparent feedback
        vehicle_capacity = float(collector_info.get("vehicle_capacity_kg") or 250.0)
        total_requested_waste = sum(float(p.get("waste_quantity_kg") or 0.0) for p in pickups_info)

        if consider_capacity and total_requested_waste > vehicle_capacity:
            excess = round(total_requested_waste - vehicle_capacity, 1)
            return {
                "feasibility_status": "Infeasible",
                "feasibility_notes": (
                    f"Vehicle Capacity Exceeded: Total waste ({total_requested_waste:.1f} kg) "
                    f"exceeds the configured capacity ({vehicle_capacity:.1f} kg) of "
                    f"{collector_info.get('vehicle_number', 'this vehicle')} by {excess:.1f} kg. "
                    f"Please select fewer pickup batches or deploy a larger bio-carrier."
                ),
                "stops": [],
                "total_distance_km": 0.0,
                "total_duration_minutes": 0.0,
                "total_waste_kg": total_requested_waste,
                "capacity_utilization_pct": round((total_requested_waste / vehicle_capacity) * 100.0, 1),
                "route_geometry": []
            }

        # Nodes: 0 is Collector Depot / Starting Location, 1..N are Hospital Pickups
        nodes = [{
            "is_depot": True,
            "id": 0,
            "name": f"Collector Starting Depot ({collector_info.get('name')})",
            "address": collector_info.get("address"),
            "latitude": float(collector_info.get("latitude")),
            "longitude": float(collector_info.get("longitude")),
            "demand": 0,
            "time_window": (0, 720) # 12 hour operational window in minutes
        }]

        for idx, p in enumerate(pickups_info, start=1):
            start_m = int(p.get("time_window_start_min") or 0)
            end_m = int(p.get("time_window_end_min") or 480) # default up to 8 hrs
            if end_m <= start_m:
                end_m = start_m + 240
            nodes.append({
                "is_depot": False,
                "pickup_id": p["pickup_id"],
                "hospital_id": p["hospital_id"],
                "hospital_name": p["hospital_name"],
                "hospital_address": p["hospital_address"],
                "hospital_phone": p.get("hospital_phone", ""),
                "latitude": float(p["latitude"]),
                "longitude": float(p["longitude"]),
                "demand": int(math.ceil(float(p.get("waste_quantity_kg") or 0.0))),
                "waste_category": p.get("waste_category", "Yellow"),
                "waste_type": p.get("waste_type", "Medical Waste"),
                "waste_quantity_kg": float(p.get("waste_quantity_kg") or 0.0),
                "delay_risk": p.get("delay_risk", "Medium"),
                "time_window_start": p.get("time_window_start", "09:00"),
                "time_window_end": p.get("time_window_end", "13:00"),
                "time_window": (start_m, end_m)
            })

        num_nodes = len(nodes)

        # Distance & Time Matrices
        distance_matrix = [] # in meters for integer OR-Tools formulation
        time_matrix = [] # in minutes

        for i in range(num_nodes):
            dist_row = []
            time_row = []
            for j in range(num_nodes):
                if i == j:
                    dist_row.append(0)
                    time_row.append(0)
                else:
                    d_km = calculate_haversine_distance(
                        nodes[i]["latitude"], nodes[i]["longitude"],
                        nodes[j]["latitude"], nodes[j]["longitude"]
                    )
                    dist_row.append(int(round(d_km * 1000))) # meters
                    drive_time = estimate_travel_time_minutes(d_km)
                    time_row.append(int(round(drive_time)))
            distance_matrix.append(dist_row)
            time_matrix.append(time_row)

        # OR-Tools Routing Model Initialization
        num_vehicles = 1
        depot = 0
        manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, depot)
        routing = pywrapcp.RoutingModel(manager)

        # 1. Distance Arc Cost
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix[from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # 2. Capacity Constraint
        if consider_capacity:
            def demand_callback(from_index):
                from_node = manager.IndexToNode(from_index)
                return nodes[from_node]["demand"]

            demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
            routing.AddDimensionWithVehicleCapacity(
                demand_callback_index,
                0, # null capacity slack
                [int(math.floor(vehicle_capacity))],
                True, # start cumul to zero
                'Capacity'
            )

        # 3. Time Windows Dimension
        if consider_time_windows:
            def time_callback(from_index, to_index):
                from_node = manager.IndexToNode(from_index)
                to_node = manager.IndexToNode(to_index)
                # drive time + service/loading duration at from_node
                service = SERVICE_TIME_MINUTES if from_node != depot else 0
                return time_matrix[from_node][to_node] + service

            time_callback_index = routing.RegisterTransitCallback(time_callback)
            routing.AddDimension(
                time_callback_index,
                180, # max wait/slack time in minutes
                720, # max total time per vehicle shift (12 hours)
                False, # don't force start cumul to zero
                'Time'
            )
            time_dimension = routing.GetDimensionOrDie('Time')

            for location_idx, node_data in enumerate(nodes):
                if not node_data["is_depot"]:
                    index = manager.NodeToIndex(location_idx)
                    if index != -1:
                        tw_start, tw_end = node_data["time_window"]
                        time_dimension.CumulVar(index).SetRange(tw_start, tw_end)

        # Search Parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = 2

        solution = routing.SolveWithParameters(search_parameters)

        is_fallback = False
        fallback_notes = None

        # If strict time windows cause infeasibility, re-solve without time window constraints
        # so admin gets a helpful warning and a viable sequence instead of an empty screen
        if not solution and consider_time_windows:
            is_fallback = True
            fallback_notes = (
                "Incompatible Pickup Time Windows: The requested hospital collection hours "
                "could not all be satisfied strictly along the optimal transit route. "
                "Google OR-Tools generated the distance-optimal route; please review time window flexibilities."
            )
            # Re-solve without time window dimension
            manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, depot)
            routing = pywrapcp.RoutingModel(manager)
            transit_callback_index = routing.RegisterTransitCallback(distance_callback)
            routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
            if consider_capacity:
                demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
                routing.AddDimensionWithVehicleCapacity(
                    demand_callback_index, 0, [int(math.floor(vehicle_capacity))], True, 'Capacity'
                )
            solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            return {
                "feasibility_status": "Infeasible",
                "feasibility_notes": (
                    "No feasible multi-stop route could be solved by Google OR-Tools "
                    "with the given vehicle capacity and stop geometry constraints."
                ),
                "stops": [],
                "total_distance_km": 0.0,
                "total_duration_minutes": 0.0,
                "total_waste_kg": total_requested_waste,
                "capacity_utilization_pct": round((total_requested_waste / vehicle_capacity) * 100.0, 1),
                "route_geometry": []
            }

        # Extract Ordered Stop Sequence from Solution
        index = routing.Start(0)
        ordered_node_indices = []
        while not routing.IsEnd(index):
            ordered_node_indices.append(manager.IndexToNode(index))
            index = solution.Value(routing.NextVar(index))

        # Add return to depot if requested
        if return_to_depot and len(ordered_node_indices) > 1:
            ordered_node_indices.append(0)

        # Build detailed stop responses
        stops = []
        waypoints_for_map = []
        total_distance_meters = 0
        total_duration_mins = 0.0
        cumulative_dist_km = 0.0

        for stop_rank, node_idx in enumerate(ordered_node_indices):
            node = nodes[node_idx]
            waypoints_for_map.append((node["latitude"], node["longitude"]))

            if stop_rank == 0:
                continue # Depot start

            prev_node_idx = ordered_node_indices[stop_rank - 1]
            leg_dist_meters = distance_matrix[prev_node_idx][node_idx]
            leg_dist_km = round(leg_dist_meters / 1000.0, 2)
            total_distance_meters += leg_dist_meters
            cumulative_dist_km = round(cumulative_dist_km + leg_dist_km, 2)

            leg_drive_mins = estimate_travel_time_minutes(leg_dist_km)
            total_duration_mins += leg_drive_mins

            if not node["is_depot"]:
                total_duration_mins += SERVICE_TIME_MINUTES
                stops.append({
                    "stop_order": len(stops) + 1,
                    "pickup_id": node["pickup_id"],
                    "hospital_id": node["hospital_id"],
                    "hospital_name": node["hospital_name"],
                    "hospital_address": node["hospital_address"],
                    "hospital_phone": node.get("hospital_phone", ""),
                    "latitude": node["latitude"],
                    "longitude": node["longitude"],
                    "waste_category": node["waste_category"],
                    "waste_type": node["waste_type"],
                    "waste_quantity_kg": node["waste_quantity_kg"],
                    "distance_from_prev_km": leg_dist_km,
                    "cumulative_distance_km": cumulative_dist_km,
                    "estimated_arrival_minutes": round(total_duration_mins - SERVICE_TIME_MINUTES, 1),
                    "time_window_start": node.get("time_window_start"),
                    "time_window_end": node.get("time_window_end"),
                    "status": "Pending",
                    "delay_risk": node.get("delay_risk", "Medium")
                })

        total_distance_km = round(total_distance_meters / 1000.0, 2)
        total_duration_minutes = round(total_duration_mins, 1)
        capacity_utilization = round((total_requested_waste / vehicle_capacity) * 100.0, 1)

        feasibility_status = "Warning" if is_fallback else "Feasible"
        feasibility_notes = fallback_notes or "Route solved and validated successfully using Google OR-Tools CVRPTW solver."

        # Interpolate coordinates for visual map polyline
        route_geometry = build_route_geometry(waypoints_for_map)

        return {
            "feasibility_status": feasibility_status,
            "feasibility_notes": feasibility_notes,
            "stops": stops,
            "total_distance_km": total_distance_km,
            "total_duration_minutes": total_duration_minutes,
            "total_waste_kg": round(total_requested_waste, 1),
            "capacity_utilization_pct": capacity_utilization,
            "route_geometry": route_geometry
        }
