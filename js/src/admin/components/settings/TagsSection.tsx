import TagPickerField from './TagPickerField';

type Attrs = {
  loaded: boolean;
  tagCharacters: string;
  tagCharactersTag: any;
  tagRole: string;
  tagRoleTag: any;
  tagEpisodes: string;
  tagEpisodesTag: any;
  arenaTagSlug: string;
  arenaTag: any;
  onPickCharacters: (tag: any) => void;
  onPickRole: (tag: any) => void;
  onPickEpisodes: (tag: any) => void;
  onPickArena: (tag: any) => void;
};

/**
 * "Теги" section: which flarum/tags tag each part of the Зал Славы reads
 * from. Each field opens flarum/tags' own TagSelectionModal instead of a
 * free-text slug input, so the admin can't typo a slug that doesn't exist.
 */
export default function TagsSection({
  loaded,
  tagCharacters,
  tagCharactersTag,
  tagRole,
  tagRoleTag,
  tagEpisodes,
  tagEpisodesTag,
  arenaTagSlug,
  arenaTag,
  onPickCharacters,
  onPickRole,
  onPickEpisodes,
  onPickArena,
}: Attrs) {
  return (
    <div className="RolevayaAdminPanel">
      <TagPickerField label="Тег анкет" slug={tagCharacters} tag={tagCharactersTag} loaded={loaded} onPick={onPickCharacters} />

      <TagPickerField label="Тег ролевых тем" slug={tagRole} tag={tagRoleTag} loaded={loaded} onPick={onPickRole} />

      <TagPickerField label="Тег эпизодов" slug={tagEpisodes} tag={tagEpisodesTag} loaded={loaded} onPick={onPickEpisodes} />

      <TagPickerField
        label="Тег арены"
        help="Используется для ссылки «На Арену» в виджете на главной"
        slug={arenaTagSlug}
        tag={arenaTag}
        loaded={loaded}
        onPick={onPickArena}
      />
    </div>
  );
}
