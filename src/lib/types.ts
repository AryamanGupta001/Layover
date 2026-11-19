export type Profile = {
  id: string;
  full_name: string;
  occupation: string;
  bio: string;
  hometown: string;
  current_city: string;
  languages: string[];
  interests: string[];
};

export type PoolLeg = {
  leg_index: number;
  flight_number: string;
  origin_airport: string;
  destination_airport: string;
  departure_time: string;
  boarding_time: string;
  arrival_time: string;
};

export type ChatMessage = {
  id: number;
  pool_id: string;
  user_id: string;
  body: string;
  created_at: string;
};
