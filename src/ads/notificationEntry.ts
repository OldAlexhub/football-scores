let suppressUntil=0;
export function markNotificationEntry(){suppressUntil=Date.now()+120000;}
export function isNotificationEntry(){return Date.now()<suppressUntil;}
