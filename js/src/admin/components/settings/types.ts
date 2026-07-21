export type ManualPerk = {
  key: string;
  label: string;
  icon: string;
  color: string;
  description: string;
};

export type ManualPerkGroup = {
  discussion_id: number;
  perks: ManualPerk[];
};
