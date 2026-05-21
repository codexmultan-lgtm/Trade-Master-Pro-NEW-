import { useState } from "react";
import { useGetAdminUsers } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const { data: usersData, isLoading } = useGetAdminUsers({ search });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Users</h1>
      
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search name or email..." 
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-3">
          {usersData?.users.map(user => (
            <Link key={user.id} href={`/admin/users/${user.id}`}>
              <Card className="hover:bg-accent/5 transition-colors mb-2">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="font-bold">${user.balance.toFixed(2)}</div>
                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                      {user.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
