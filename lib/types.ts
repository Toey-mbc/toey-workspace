export type TaskStatus = 'Not Started'|'Progress'|'Waiting'|'Review'|'Done'|'Paused'|'Cancelled';
export type Priority = 'Critical'|'High'|'Medium'|'Low'|'Someday';
export type Task = {
  id:string; title:string; project:string; category:string; priority:Priority; status:TaskStatus; start_date:string; due_date:string; description:string; progress:number; people:string; tags:string; links:string; created_at:string; updated_at:string; completed_at?:string|null; history:string[];
};
export type ShipmentStatus = 'Supplier Confirm'|'Production'|'Ready'|'Booking'|'Container Loading'|'ETD'|'At Sea'|'ETA'|'Customs'|'Warehouse'|'Completed'|'Delayed'|'Cancelled';
export type Shipment = {
  id:string; name:string; tag:string; po:string; pi:string; supplier:string; forwarder:string; shipping_line:string; vessel:string; voyage:string; container_no:string; origin_port:string; destination_port:string; supplier_confirm_date:string; forwarder_confirm_date:string; planned_ship_date:string; etd:string; eta:string; actual_departure:string; actual_arrival:string; warehouse_date:string; status:ShipmentStatus; remark:string; links:string; created_at:string; updated_at:string; history:string[];
};
