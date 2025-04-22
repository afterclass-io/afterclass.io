export type ProfileProps = {
  icon: React.ReactNode;
  name: string;
};

export const Profile = ({ icon, name }: ProfileProps) => {
  return (
    <div className="flex items-center gap-2 text-center">
      {icon}
      <div className="text-muted-foreground overflow-hidden text-sm text-ellipsis">
        {name}
      </div>
    </div>
  );
};
