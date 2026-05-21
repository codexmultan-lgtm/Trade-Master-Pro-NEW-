import { useGetNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getGetNotificationsQueryKey, getGetUnreadNotificationCountQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";

export default function Notifications() {
  const { data: notifsData, isLoading } = useGetNotifications({ limit: 50 });
  const queryClient = useQueryClient();

  const markRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    }
  });

  const markAllRead = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
      }
    }
  });

  if (isLoading) return <div className="p-4 text-center mt-10">Loading notifications...</div>;

  const notifications = notifsData?.notifications || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {notifications.some(n => !n.read) && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <CheckCheck className="w-4 h-4 mr-2" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length > 0 ? notifications.map(notif => (
          <Card key={notif.id} className={`border-border cursor-pointer transition-colors ${!notif.read ? 'bg-card border-primary/50' : 'bg-background'}`} onClick={() => !notif.read && markRead.mutate({ data: { id: notif.id } as any })}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-sm">{notif.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(notif.createdAt).toLocaleDateString()}</div>
              </div>
              <p className="text-sm text-muted-foreground">{notif.message}</p>
            </CardContent>
          </Card>
        )) : (
          <div className="text-center text-muted-foreground p-8">No notifications</div>
        )}
      </div>
    </div>
  );
}
