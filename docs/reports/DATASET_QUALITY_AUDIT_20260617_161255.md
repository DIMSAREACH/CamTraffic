# Dataset Quality Audit Report

Generated: 2026-06-17 16:12 UTC
Dataset: `D:\Year4\Project Thesis\Expert System\Project\CamTraffic\ai\dataset`
Classes (data.yaml): `D:\Year4\Project Thesis\Expert System\Project\CamTraffic\ai\data.yaml`

## Summary

| Metric | Value |
|--------|-------|
| Total images | 2840 |
| Classes with images | 236 |
| Classes with zero images | 0 |
| Images with errors | 0 |
| Images with warnings | 94 |
| Total error flags | 0 |
| Total warning flags | 94 |
| Exact duplicate groups | 0 |
| Near-duplicate pairs | 9 |
| Classes with &lt;5 images | 0 |
| Blur threshold (Laplacian var) | 80.0 |

## Per-Class Summary

| Class Name | Image Count | Label Count | Possible Errors | Recommended Fixes |
|------------|-------------|-------------|-----------------|-------------------|
| AXLE_WEIGHT_LIMIT | 12 | 12 | — | — |
| HEIGHT_LIMIT | 12 | 12 | train/HEIGHT_LIMIT_Height limit_11.jpg: overexposed (mean=223.6); no validation images | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| I_3_LANES_MERGE_TO_2_LANES_FROM_THE_LEFT | 12 | 12 | — | — |
| I_3_LANES_MERGE_TO_2_LANES_FROM_THE_RIGHT | 12 | 12 | — | — |
| I_ABREAST_TRAVELLING_PERMITTED_FOR_BICYCLE | 12 | 12 | — | — |
| I_AIRPORTS | 12 | 12 | — | — |
| I_ANIMAL_DRAWN_CARTS | 12 | 12 | — | — |
| I_ARROW_DIRECTION_EXCLUSIVE_LANE | 12 | 12 | — | — |
| I_ASIAN_HIGHWAY_ROUTE_1 | 12 | 12 | — | — |
| I_ASIAN_HIGHWAY_ROUTE_11 | 12 | 12 | — | — |
| I_BACKWARD | 12 | 12 | train/I_BACKWARD_Backward_00.jpg: overexposed (mean=221.9); train/I_BACKWARD_Backward_03.jpg: overexposed (mean=222.7) | Replace with sharper, well-lit reference captures |
| I_BEWARE_OF_TRAINS | 12 | 12 | — | — |
| I_BICYCLES | 12 | 12 | train/I_BICYCLES_Bicycles_02.jpg: overexposed (mean=221.9); train/I_BICYCLES_Bicycles_03.jpg: overexposed (mean=229.1); … | Replace with sharper, well-lit reference captures |
| I_BOATS_RAMP | 12 | 12 | — | — |
| I_BUILT_UP_AREA_BEGINS | 12 | 12 | train/I_BUILT_UP_AREA_BEGINS_Built-up area begins_03.jpg: overexposed (mean=222.3) | Replace with sharper, well-lit reference captures |
| I_BUILT_UP_AREA_ENDS | 12 | 12 | train/I_BUILT_UP_AREA_ENDS_Built-up area ends_09.jpg: overexposed (mean=228.5); val/I_BUILT_UP_AREA_ENDS_Built-up area e… | Replace with sharper, well-lit reference captures |
| I_BUSES | 12 | 12 | — | — |
| I_CAMPING_AREA | 12 | 12 | — | — |
| I_CARAVANS_PARK_AND_CAMPING_AREA | 12 | 12 | — | — |
| I_CARAVANS_PARK_OR_SITE | 12 | 12 | — | — |
| I_CARS | 12 | 12 | — | — |
| I_CHEVRON_MARKER_TO_THE_LEFT | 12 | 12 | train/I_CHEVRON_MARKER_TO_THE_LEFT_Chevron marker (to the left)_04.jpg: overexposed (mean=220.6) | Replace with sharper, well-lit reference captures |
| I_CHEVRON_MARKER_TO_THE_RIGHT | 12 | 12 | — | — |
| I_CLINIC | 12 | 12 | — | — |
| I_COMPULSORY_LANES | 12 | 12 | — | — |
| I_DEAD_END | 12 | 12 | — | — |
| I_DEAD_END_ON_THE_RIGHT | 12 | 12 | — | — |
| I_DEAD_END_ROAD_ON_THE_LEFT | 12 | 12 | — | — |
| I_DELINEATOR_POST | 12 | 12 | — | — |
| I_DETOUR_FOR_THE_TURNING_LEFT | 12 | 12 | — | — |
| I_DETOUR_FOR_THE_VEHICLE_HAVING_OVERALL_HE | 12 | 12 | — | — |
| I_DIRECTIONS_TO_CITY_OR_PROVINCE | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| I_DIRECTION_OF_PRIORITY_ROAD | 12 | 12 | — | — |
| I_DIRECTION_SIGN_TO_CITIES_OR_PROVINCES_AT | 12 | 12 | — | — |
| I_DIRECTION_SIGN_TO_CITIES_OR_PROVINCES_AT_2 | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| I_DIRECTION_SIGN_TO_OTHER_AREAS_AT_DETOUR | 12 | 12 | train/I_DIRECTION_SIGN_TO_OTHER_AREAS_AT_DETOUR_Direction sign to other areas (at detour)_10.jpg: overexposed (mean=222.… | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| I_DIRECTION_SIGN_TO_OTHER_AREAS_AT_JUNCTIO | 12 | 12 | val/I_DIRECTION_SIGN_TO_OTHER_AREAS_AT_JUNCTIO_Direction sign to other areas (at junction)_11.jpg: overexposed (mean=223… | Replace with sharper, well-lit reference captures |
| I_DISTANCE_IDENTIFICATION_MARKER | 12 | 12 | — | — |
| I_DRINKING_WATERS | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| I_EXPRESSWAY_BEGINS | 12 | 12 | — | — |
| I_EXPRESSWAY_ENDS | 12 | 12 | — | — |
| I_EXPRESSWAY_NUMBER | 12 | 12 | train/I_EXPRESSWAY_NUMBER_Expressway number_01.jpg: overexposed (mean=226.0); no validation images | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| I_FACTORY_GATE | 12 | 12 | train/I_FACTORY_GATE_Factory gate_03.jpg: overexposed (mean=222.0); train/I_FACTORY_GATE_Factory gate_05.jpg: overexpose… | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| I_FERRY | 12 | 12 | — | — |
| I_FOREST_FIRE_WARNING_SIGNS | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| I_FORWARD | 12 | 12 | train/I_FORWARD_Forward_08.jpg: overexposed (mean=220.9) | Replace with sharper, well-lit reference captures |
| I_FORWARD_AND_BACKWARD | 12 | 12 | train/I_FORWARD_AND_BACKWARD_Forward and backward_06.jpg: overexposed (mean=220.6) | Replace with sharper, well-lit reference captures |
| I_GARAGE_STATION | 12 | 12 | — | — |
| I_GAS_STATION | 12 | 12 | — | — |
| I_GAS_STATION_AND_REPAIR | 12 | 12 | — | — |
| I_GUIDE_POST_AT_DANGEROUS_CURVE | 12 | 12 | no validation images; 1 duplicate/near-duplicate group(s) | Move or add 15–20% of images to val split; Review duplicate pairs; keep one canonical image per augmentation |
| I_GUIDE_SIGN_TO_OTHER_PLACES | 12 | 12 | train/I_GUIDE_SIGN_TO_OTHER_PLACES_Guide sign to other places_01.jpg: overexposed (mean=220.4); no validation images | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| I_HOSPITAL | 12 | 12 | — | — |
| I_HOTEL_OR_MOTEL | 12 | 12 | — | — |
| I_KRAMUON_SAR_AVENUE | 12 | 12 | — | — |
| I_LARGE_SIZE_TRUCKS_HAVING_OVERALL_LENGTH | 12 | 12 | — | — |
| I_MOTORCYCLES | 12 | 12 | — | — |
| I_MOTORCYCLE_DRAWN_CARTS | 12 | 12 | — | — |
| I_NATIONAL_ROAD_NUMBER | 12 | 12 | train/I_NATIONAL_ROAD_NUMBER_National road number_00.jpg: overexposed (mean=221.3) | Replace with sharper, well-lit reference captures |
| I_OBJECT_MARKER_ON_THE_CURVE | 12 | 12 | — | — |
| I_OBJECT_MARKER_ON_THE_LEFT | 12 | 12 | — | — |
| I_OBJECT_MARKER_ON_THE_RIGHT | 12 | 12 | — | — |
| I_OFFICIAL_TOURIST_INFORMATION | 12 | 12 | — | — |
| I_ONE_WAY_TRAFFIC | 12 | 12 | — | — |
| I_PARKING_LOT | 12 | 12 | — | — |
| I_PAY_PARKING_LOT | 12 | 12 | — | — |
| I_PICNIC_SITE | 12 | 12 | — | — |
| I_PREAH_NORODOM_BOULEVARD | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| I_PREAH_TRASAK_PAEM_STREET | 12 | 12 | train/I_PREAH_TRASAK_PAEM_STREET_Preah Trasak Paem Street_02.jpg: overexposed (mean=222.7) | Replace with sharper, well-lit reference captures |
| I_PROVINCIAL_DISTRICT_OR_COMMUNE_BOUNDARY | 12 | 12 | — | — |
| I_PROVINCIAL_DISTRICT_OR_COMMUNE_BOUNDARY_2 | 12 | 12 | — | — |
| I_RAILWAY_CROSSING_POST | 12 | 12 | train/I_RAILWAY_CROSSING_POST_Railway crossing post_01.jpg: overexposed (mean=225.1) | Replace with sharper, well-lit reference captures |
| I_RECYCLE_BIN | 12 | 12 | — | — |
| I_REFRESHMENTS_SHOP | 12 | 12 | — | — |
| I_RESTAURANTS_SHOP | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| I_STREET_NO_113 | 12 | 12 | — | — |
| I_TAXIS_STATION | 12 | 12 | — | — |
| I_TELEPHONE | 12 | 12 | — | — |
| I_TIME_IDENTIFICATION_MARKER | 12 | 12 | train/I_TIME_IDENTIFICATION_MARKER_Time identification marker_07.jpg: overexposed (mean=221.2) | Replace with sharper, well-lit reference captures |
| I_TOILETS | 12 | 12 | — | — |
| I_TO_THE_LEFT_HAND_SIDE | 12 | 12 | val/I_TO_THE_LEFT_HAND_SIDE_To the left hand side_07.jpg: overexposed (mean=228.1) | Replace with sharper, well-lit reference captures |
| I_TO_THE_RIGHT_AND_LEFT_HAND_SIDE | 12 | 12 | train/I_TO_THE_RIGHT_AND_LEFT_HAND_SIDE_To the right and left hand side_02.jpg: overexposed (mean=222.1); val/I_TO_THE_R… | Replace with sharper, well-lit reference captures |
| I_TO_THE_RIGHT_HAND_SIDE | 12 | 12 | train/I_TO_THE_RIGHT_HAND_SIDE_To the right hand side_03.jpg: overexposed (mean=220.1) | Replace with sharper, well-lit reference captures |
| I_TRACTORS | 12 | 12 | — | — |
| I_TRUCKS | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| I_U_TURN | 12 | 12 | — | — |
| I_VEHICLES_HAVING_OVERALL_LENGTH_WEIGHT_LI | 12 | 12 | train/I_VEHICLES_HAVING_OVERALL_LENGTH_WEIGHT_LI_Vehicles having overall length weight limit on one axle exceeding the s… | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| I_VEHICLES_HAVING_OVER_ALL_LENGTH_HEIGHT_E | 12 | 12 | train/I_VEHICLES_HAVING_OVER_ALL_LENGTH_HEIGHT_E_Vehicles having over all length height exceeding the specified height_0… | Replace with sharper, well-lit reference captures |
| I_VEHICLES_HAVING_OVER_ALL_LENGTH_WIDTH_EX | 12 | 12 | — | — |
| I_VEHICLES_LOADING_INFLAMMABLE_GOODS | 12 | 12 | — | — |
| I_WEIGH_STATION | 12 | 12 | val/I_WEIGH_STATION_Weigh station_10.jpg: overexposed (mean=225.6) | Replace with sharper, well-lit reference captures |
| LENGTH_LIMIT | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| M_ANIMAL_DRAWN_CARTS_OF_ALL_FORM_ONLY | 12 | 12 | — | — |
| M_BICYCLES_ONLY | 12 | 12 | — | — |
| M_BUSES_LANE | 12 | 12 | — | — |
| M_CARS_ONLY | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| M_DOUBLE_TRIPLE_RAILWAY_CROSSING | 12 | 12 | train/M_DOUBLE_TRIPLE_RAILWAY_CROSSING_Double triple railway crossing_02.jpg: overexposed (mean=223.8); train/M_DOUBLE_T… | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| M_END_OF_BICYCLES_ONLY | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| M_END_OF_BUSES_LANE | 12 | 12 | — | — |
| M_END_OF_MINIMUM_SPEED_LIMIT | 12 | 12 | — | — |
| M_END_OF_PEDESTRIANS_AND_BICYCLES_ONLY | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| M_END_OF_PEDESTRIANS_ONLY | 12 | 12 | — | — |
| M_END_OF_PRIORITY_ROAD | 12 | 12 | — | — |
| M_GIVE_WAY_TO_ALL_TRAFFIC_FROM_THE_OPPOSIT | 12 | 12 | — | — |
| M_GO_STRAIGHT | 12 | 12 | 1 duplicate/near-duplicate group(s) | Review duplicate pairs; keep one canonical image per augmentation |
| M_GO_STRAIGHT_OR_TURN_LEFT | 12 | 12 | — | — |
| M_GO_STRAIGHT_OR_TURN_RIGHT | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| M_KEEP_LEFT | 12 | 12 | — | — |
| M_KEEP_RIGHT | 12 | 12 | — | — |
| M_MINIMUM_SPEED_LIMIT | 12 | 12 | — | — |
| M_PEDESTRIANS_AND_BICYCLES_ONLY | 12 | 12 | — | — |
| M_PEDESTRIANS_ONLY | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| M_PRIORITY_INTERSECTION | 12 | 12 | — | — |
| M_PRIORITY_OVER_ALL_TRAFFIC_FROM_THE_OPPOS | 12 | 12 | — | — |
| M_PRIORITY_ROAD | 12 | 12 | train/M_PRIORITY_ROAD_Priority road_06.jpg: overexposed (mean=230.0); train/M_PRIORITY_ROAD_Priority road_07.jpg: overex… | Replace with sharper, well-lit reference captures |
| M_SINGLE_TRACK_RAILWAY_CROSSING | 12 | 12 | train/M_SINGLE_TRACK_RAILWAY_CROSSING_Single track railway crossing_09.jpg: overexposed (mean=226.7); val/M_SINGLE_TRACK… | Replace with sharper, well-lit reference captures |
| M_SLOW_DOWN | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| M_STOP | 12 | 12 | — | — |
| M_STOP_KHMER_AND_ENGLISH_LANGUAGES | 12 | 12 | — | — |
| M_TURN_LEFT | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| M_TURN_LEFT_AHEAD | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| M_TURN_LEFT_OR_RIGHT | 12 | 12 | — | — |
| M_TURN_RIGHT | 12 | 12 | 1 duplicate/near-duplicate group(s) | Review duplicate pairs; keep one canonical image per augmentation |
| M_TURN_RIGHT_AHEAD | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| M_YIELD_AT_ROUNDABOUT | 12 | 12 | train/M_YIELD_AT_ROUNDABOUT_Yield (at roundabout)_10.jpg: overexposed (mean=220.1) | Replace with sharper, well-lit reference captures |
| M_YIELD_GIVE_WAY | 12 | 12 | — | — |
| NO_ENTRY | 12 | 12 | — | — |
| NO_LEFT_TURN | 12 | 12 | train/NO_LEFT_TURN_No left turn_01.jpg: overexposed (mean=220.8); 1 duplicate/near-duplicate group(s) | Review duplicate pairs; keep one canonical image per augmentation; Replace with sharper, well-lit reference captures |
| NO_PARKING | 12 | 12 | — | — |
| NO_RIGHT_TURN | 12 | 12 | — | — |
| NO_STOPPING | 12 | 12 | — | — |
| NO_U_TURN | 12 | 12 | — | — |
| P_END_OF_HONKING_PROHIBITION | 12 | 12 | — | — |
| P_END_OF_MAXIMUM_SPEED_LIMIT | 12 | 12 | — | — |
| P_END_OF_OVERTAKING_PROHIBITION | 12 | 12 | train/P_END_OF_OVERTAKING_PROHIBITION_End of overtaking prohibition_10.jpg: overexposed (mean=228.9) | Replace with sharper, well-lit reference captures |
| P_END_OF_OVERTAKING_PROHIBITION_FOR_TRUCKS | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| P_END_OF_PROHIBITION_OVERTAKING_FOR_TRUCKS | 12 | 12 | — | — |
| P_MAXIMUM_SPEED_LIMIT | 12 | 12 | — | — |
| P_MINIMUM_SEPARATION_DISTANCE_FOR_CARS | 12 | 12 | — | — |
| P_MINIMUM_SEPARATION_DISTANCE_FOR_TRUCKS | 12 | 12 | — | — |
| P_NO_ANIMAL_DRAWN_CARTS | 12 | 12 | — | — |
| P_NO_BICYCLES | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| P_NO_BICYCLES_MOTORCYCLES_AND_TRICYCLES | 12 | 12 | — | — |
| P_NO_BUSES | 12 | 12 | — | — |
| P_NO_CARS | 12 | 12 | — | — |
| P_NO_CARTS | 12 | 12 | — | — |
| P_NO_HONKING | 12 | 12 | — | — |
| P_NO_MOTORCYCLES | 12 | 12 | — | — |
| P_NO_MOTORCYCLE_DRAWN_CARTS | 12 | 12 | — | — |
| P_NO_MOTOR_VEHICLES | 12 | 12 | — | — |
| P_NO_OVERTAKING | 12 | 12 | val/P_NO_OVERTAKING_No overtaking_11.jpg: overexposed (mean=222.8) | Replace with sharper, well-lit reference captures |
| P_NO_OVERTAKING_FOR_TRUCKS | 12 | 12 | — | — |
| P_NO_PARKING_FROM_16TH_TO_31ST_DAY_OF_THE | 12 | 12 | — | — |
| P_NO_PARKING_FROM_1ST_TO_15TH_DAY_OF_THE_M | 12 | 12 | — | — |
| P_NO_PARKING_ON_EVEN_DAYS | 12 | 12 | — | — |
| P_NO_PARKING_ON_ODD_DAYS | 12 | 12 | — | — |
| P_NO_TOWED_TRAILERS | 12 | 12 | — | — |
| P_NO_TRACTORS | 12 | 12 | — | — |
| P_NO_TRUCKS | 12 | 12 | — | — |
| P_NO_VEHICLES_LOADING_INFLAMMABLE_GOODS | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| P_SPEED_LIMIT_20_KM_H | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| P_SPEED_LIMIT_50_KM_H | 12 | 12 | val/P_SPEED_LIMIT_50_KM_H_Speed limit 50 km-h_11.jpg: overexposed (mean=221.6) | Replace with sharper, well-lit reference captures |
| P_STOP_AT_THE_CUSTOMS_STATION | 12 | 12 | — | — |
| P_STOP_AT_THE_MILITARY_POLICE_STATION | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| P_STOP_AT_THE_POLICE_STATION | 12 | 12 | — | — |
| ROAD_CLOSED_ALL_USERS | 12 | 12 | — | — |
| ROAD_CLOSED_ALL_VEHICLES | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| TOTAL_WEIGHT_LIMIT | 12 | 12 | — | — |
| WIDTH_LIMIT | 12 | 12 | — | — |
| W_BICYCLES_CROSSING | 12 | 12 | — | — |
| W_CATTLE_OR_DOMESTIC_ANIMALS | 12 | 12 | — | — |
| W_CROSSROAD | 12 | 12 | val/W_CROSSROAD_Crossroad_02.jpg: overexposed (mean=226.4); val/W_CROSSROAD_Crossroad_07.jpg: overexposed (mean=223.4) | Replace with sharper, well-lit reference captures |
| W_CROSSROAD_ON_A_CURVE_DIFFERENT_ROAD_CLAS | 12 | 12 | train/W_CROSSROAD_ON_A_CURVE_DIFFERENT_ROAD_CLAS_Crossroad on a curve (different road classes)_10.jpg: overexposed (mean… | Replace with sharper, well-lit reference captures |
| W_CROSSROAD_ON_A_DOUBLE_CURVE_DIFFERENT_RO | 12 | 12 | — | — |
| W_CROSSROAD_ON_THE_LEFT_DIFFERENT_ROAD_CLA | 12 | 12 | train/W_CROSSROAD_ON_THE_LEFT_DIFFERENT_ROAD_CLA_Crossroad on the left (different road classes)_05.jpg: overexposed (mea… | Replace with sharper, well-lit reference captures |
| W_CROSSROAD_ON_THE_RIGHT_DIFFERENT_ROAD_CL | 12 | 12 | train/W_CROSSROAD_ON_THE_RIGHT_DIFFERENT_ROAD_CL_Crossroad on the right (different road classes)_04.jpg: overexposed (me… | Replace with sharper, well-lit reference captures |
| W_CROSSWINDS | 12 | 12 | train/W_CROSSWINDS_Crosswinds_04.jpg: overexposed (mean=225.8); no validation images; 1 duplicate/near-duplicate group(s… | Move or add 15–20% of images to val split; Review duplicate pairs; keep one canonical image per augmentation; Replace wi… |
| W_CURVE_TO_THE_LEFT | 12 | 12 | val/W_CURVE_TO_THE_LEFT_Curve to the left_06.jpg: overexposed (mean=228.7) | Replace with sharper, well-lit reference captures |
| W_CURVE_TO_THE_RIGHT | 12 | 12 | train/W_CURVE_TO_THE_RIGHT_Curve to the right_07.jpg: overexposed (mean=222.7) | Replace with sharper, well-lit reference captures |
| W_DEER_OR_WILD_ANIMALS | 12 | 12 | 1 duplicate/near-duplicate group(s) | Review duplicate pairs; keep one canonical image per augmentation |
| W_DETOUR_TO_THE_LEFT | 12 | 12 | train/W_DETOUR_TO_THE_LEFT_Detour to the left_01.jpg: overexposed (mean=220.9) | Replace with sharper, well-lit reference captures |
| W_DETOUR_TO_THE_RIGHT | 12 | 12 | val/W_DETOUR_TO_THE_RIGHT_Detour to the right_01.jpg: overexposed (mean=221.8) | Replace with sharper, well-lit reference captures |
| W_DIRECTION_CHEVRON_TO_BE_FOLLOWED | 12 | 12 | val/W_DIRECTION_CHEVRON_TO_BE_FOLLOWED_Direction chevron to be followed_05.jpg: overexposed (mean=220.3) | Replace with sharper, well-lit reference captures |
| W_DIVIDED_ROADS_BEGINS | 12 | 12 | — | — |
| W_DIVIDED_ROADS_ENDS | 12 | 12 | train/W_DIVIDED_ROADS_ENDS_Divided roads ends_08.jpg: overexposed (mean=225.5); no validation images | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| W_DOUBLE_CURVE_FIRST_TO_THE_LEFT | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| W_DOUBLE_CURVE_FIRST_TO_THE_RIGHT | 12 | 12 | train/W_DOUBLE_CURVE_FIRST_TO_THE_RIGHT_Double curve first to the right_10.jpg: overexposed (mean=222.6) | Replace with sharper, well-lit reference captures |
| W_DOUBLE_SHARP_CURVE_FIRST_TO_THE_LEFT | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| W_DOUBLE_SHARP_CURVE_FIRST_TO_THE_RIGHT | 12 | 12 | — | — |
| W_END_ROAD_WORKS | 12 | 12 | — | — |
| W_FALLING_ROCKS | 12 | 12 | train/W_FALLING_ROCKS_Falling rocks_05.jpg: overexposed (mean=222.0) | Replace with sharper, well-lit reference captures |
| W_GIVE_WAY_SIGNS_AHEAD | 12 | 12 | train/W_GIVE_WAY_SIGNS_AHEAD_Give way signs ahead_10.jpg: overexposed (mean=223.0); no validation images | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| W_HANDICAPPED_CROSSING | 12 | 12 | train/W_HANDICAPPED_CROSSING_Handicapped crossing_08.jpg: overexposed (mean=225.3) | Replace with sharper, well-lit reference captures |
| W_JUNCTION_ON_A_CURVE_DIFFERENT_ROAD_CLASS | 12 | 12 | — | — |
| W_JUNCTION_ON_A_DOUBLE_CURVE_DIFFERENT_ROA | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| W_LOW_FLYING_AIR_CRAFT | 12 | 12 | — | — |
| W_NARROW_BRIDGE | 12 | 12 | train/W_NARROW_BRIDGE_Narrow bridge_07.jpg: overexposed (mean=224.9); train/W_NARROW_BRIDGE_Narrow bridge_10.jpg: overex… | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| W_OFFSET_ROAD_JUNCTION_LEFT_AND_RIGHT | 12 | 12 | train/W_OFFSET_ROAD_JUNCTION_LEFT_AND_RIGHT_Offset road junction, left and right_04.jpg: overexposed (mean=221.1); train… | Replace with sharper, well-lit reference captures |
| W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT | 12 | 12 | train/W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_Offset road junction, right and left_10.jpg: overexposed (mean=229.0); 2 dup… | Review duplicate pairs; keep one canonical image per augmentation; Replace with sharper, well-lit reference captures |
| W_OTHER_DANGER | 12 | 12 | train/W_OTHER_DANGER_Other danger_07.jpg: overexposed (mean=223.9); train/W_OTHER_DANGER_Other danger_10.jpg: overexpose… | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| W_RAILWAY_CROSSING_ON_THE_LEFT_ROAD | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| W_RAILWAY_CROSSING_ON_THE_RIGHT_ROAD | 12 | 12 | — | — |
| W_RAILWAY_CROSSING_WITHOUT_BARRIER_OR_GATE | 12 | 12 | — | — |
| W_RAILWAY_CROSSING_WITH_BARRIER_OR_GATES | 12 | 12 | — | — |
| W_RED_FLAG | 12 | 12 | train/W_RED_FLAG_Red-flag_00.jpg: low sharpness (Laplacian=62.7); train/W_RED_FLAG_Red-flag_01.jpg: low sharpness (Lapla… | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| W_ROAD_NARROWS_ON_THE_BOTH_SIDES | 12 | 12 | — | — |
| W_ROAD_NARROWS_ON_THE_LEFT | 12 | 12 | — | — |
| W_ROAD_NARROWS_ON_THE_RIGHT | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| W_ROUNDABOUT_AHEAD | 12 | 12 | — | — |
| W_SCHOOL_AHEAD_ONLY_APPLIES_TO_PUBLIC_SCHO | 12 | 12 | — | — |
| W_SHARP_CURVE_TO_THE_LEFT | 12 | 12 | — | — |
| W_SHARP_CURVE_TO_THE_RIGHT | 12 | 12 | train/W_SHARP_CURVE_TO_THE_RIGHT_Sharp curve to the right_04.jpg: overexposed (mean=222.2); no validation images | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| W_SIDE_ROAD_JUNCTION_ON_THE_LEFT | 12 | 12 | val/W_SIDE_ROAD_JUNCTION_ON_THE_LEFT_Side road junction on the left_11.jpg: overexposed (mean=221.4) | Replace with sharper, well-lit reference captures |
| W_SIDE_ROAD_JUNCTION_ON_THE_LEFT_DIFFERENT | 12 | 12 | val/W_SIDE_ROAD_JUNCTION_ON_THE_LEFT_DIFFERENT_Side road junction on the left (different road classes)_02.jpg: overexpos… | Replace with sharper, well-lit reference captures |
| W_SIDE_ROAD_JUNCTION_ON_THE_RIGHT | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| W_SIDE_ROAD_JUNCTION_ON_THE_RIGHT_DIFFEREN | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| W_SKEWED_SIDE_ROAD_JUNCTION_ON_THE_LEFT | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| W_SKEWED_SIDE_ROAD_JUNCTION_ON_THE_RIGHT | 12 | 12 | — | — |
| W_SLIPPERY_ROAD | 12 | 12 | train/W_SLIPPERY_ROAD_Slippery road_09.jpg: overexposed (mean=220.8); no validation images | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| W_STEEP_CLIMB | 12 | 12 | — | — |
| W_STEEP_DESCENT | 12 | 12 | — | — |
| W_STOP_SIGNS_AHEAD | 12 | 12 | train/W_STOP_SIGNS_AHEAD_Stop signs ahead_05.jpg: overexposed (mean=227.7) | Replace with sharper, well-lit reference captures |
| W_TEMPORARY_STOP_SIGNS_KHMER_AND_ENGLISH_L | 12 | 12 | train/W_TEMPORARY_STOP_SIGNS_KHMER_AND_ENGLISH_L_Temporary stop signs (Khmer and English languages)_00.jpg: overexposed … | Replace with sharper, well-lit reference captures |
| W_TRAFFIC_CONE | 12 | 12 | train/W_TRAFFIC_CONE_Traffic cone_00.jpg: low sharpness (Laplacian=69.1); train/W_TRAFFIC_CONE_Traffic cone_01.jpg: low … | Replace with sharper, well-lit reference captures |
| W_TRAFFIC_LIGHTS_AHEAD | 12 | 12 | — | — |
| W_TWO_WAY_TRAFFIC | 12 | 12 | train/W_TWO_WAY_TRAFFIC_Two-way traffic_09.jpg: overexposed (mean=221.7) | Replace with sharper, well-lit reference captures |
| W_T_JUNCTION_AHEAD | 12 | 12 | train/W_T_JUNCTION_AHEAD_T-junction ahead_06.jpg: overexposed (mean=228.8); train/W_T_JUNCTION_AHEAD_T-junction ahead_09… | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| W_UNEVEN_ROAD | 12 | 12 | — | — |
| W_UNPROTECTED_QUAYSIDE_OR_RIVERBANK_AHEAD | 12 | 12 | train/W_UNPROTECTED_QUAYSIDE_OR_RIVERBANK_AHEAD_Unprotected quayside or riverbank ahead_04.jpg: overexposed (mean=220.6) | Replace with sharper, well-lit reference captures |
| W_WINDING_ROAD | 12 | 12 | train/W_WINDING_ROAD_Winding road_03.jpg: overexposed (mean=221.7) | Replace with sharper, well-lit reference captures |
| W_WORKERS | 12 | 12 | — | — |
| W_WORKERS_AHEAD | 12 | 12 | train/W_WORKERS_AHEAD_Workers ahead_10.jpg: overexposed (mean=222.5); no validation images | Move or add 15–20% of images to val split; Replace with sharper, well-lit reference captures |
| W_Y_JUNCTION_AHEAD | 12 | 12 | — | — |
| W_HUMP | 14 | 14 | val/W_HUMP_Hump_00.jpg: overexposed (mean=226.5) | Replace with sharper, well-lit reference captures |
| W_LOOSE_ROAD_SURFACE_2 | 15 | 15 | 1 duplicate/near-duplicate group(s) | Review duplicate pairs; keep one canonical image per augmentation |
| W_PEDESTRIAN_CROSSING | 15 | 15 | — | — |

## Duplicate Groups (sample)

- **near_dup_I_GUIDE_POST_AT_DANGEROUS_CURVE_I_GUIDE_POST_AT_DANGEROUS_CURVE_Guide post (at dangerous curve)_00_I_GUIDE_POST_AT_DANGEROUS_CURVE_Guide post (at dangerous curve)_03**: I_GUIDE_POST_AT_DANGEROUS_CURVE_Guide post (at dangerous curve)_00.jpg, I_GUIDE_POST_AT_DANGEROUS_CURVE_Guide post (at dangerous curve)_03.jpg
- **near_dup_M_GO_STRAIGHT_M_GO_STRAIGHT_Go straight_02_M_GO_STRAIGHT_Go straight_05**: M_GO_STRAIGHT_Go straight_02.jpg, M_GO_STRAIGHT_Go straight_05.jpg
- **near_dup_M_TURN_RIGHT_M_TURN_RIGHT_Turn right_10_M_TURN_RIGHT_Turn right_04**: M_TURN_RIGHT_Turn right_10.jpg, M_TURN_RIGHT_Turn right_04.jpg
- **near_dup_NO_LEFT_TURN_NO_LEFT_TURN_No left turn_04_NO_LEFT_TURN_No left turn_06**: NO_LEFT_TURN_No left turn_04.jpg, NO_LEFT_TURN_No left turn_06.jpg
- **near_dup_W_CROSSWINDS_W_CROSSWINDS_Crosswinds_01_W_CROSSWINDS_Crosswinds_08**: W_CROSSWINDS_Crosswinds_01.jpg, W_CROSSWINDS_Crosswinds_08.jpg
- **near_dup_W_DEER_OR_WILD_ANIMALS_W_DEER_OR_WILD_ANIMALS_Deer or wild animals_07_W_DEER_OR_WILD_ANIMALS_Deer or wild animals_08**: W_DEER_OR_WILD_ANIMALS_Deer or wild animals_07.jpg, W_DEER_OR_WILD_ANIMALS_Deer or wild animals_08.jpg
- **near_dup_W_LOOSE_ROAD_SURFACE_2_W_LOOSE_ROAD_SURFACE_2_Loose road surface_09_W_LOOSE_ROAD_SURFACE_2_Loose road surface_10**: W_LOOSE_ROAD_SURFACE_2_Loose road surface_09.jpg, W_LOOSE_ROAD_SURFACE_2_Loose road surface_10.jpg
- **near_dup_W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_Offset road junction, right and left_00_W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_Offset road junction, right and left_03**: W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_Offset road junction, right and left_00.jpg, W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_Offset road junction, right and left_03.jpg
- **near_dup_W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_Offset road junction, right and left_04_W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_Offset road junction, right and left_08**: W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_Offset road junction, right and left_04.jpg, W_OFFSET_ROAD_JUNCTION_RIGHT_AND_LEFT_Offset road junction, right and left_08.jpg

## Notes

- This report is **read-only** — no dataset files were modified.
- Review label/filename mismatches manually before retraining.
- Low sharpness warnings use Laplacian variance on full composite images.
- Near-duplicates use perceptual hash (Hamming distance ≤ 6) within the same class.
