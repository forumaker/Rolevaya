import app from 'flarum/admin/app';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
// Reusing flarum/tags' own tag picker (ext:vendor/extension/.../module import,
// see https://docs.flarum.org/extend/frontend/#importing-from-extensions)
// instead of hand-rolling a tag <select>/autocomplete. This extension
// already hard-depends on flarum/tags for its taxonomy (see composer.json),
// so the modal is guaranteed to be available.
import TagSelectionModal from 'ext:flarum/tags/common/components/TagSelectionModal';

type Attrs = {
  label: string;
  help?: string;
  slug: string;
  tag: any | null;
  loaded: boolean;
  onPick: (tag: any) => void;
};

/** One "pick a single tag" field, used four times by TagsSection. */
export default function TagPickerField({ label, help, slug, tag, loaded, onPick }: Attrs) {
  return (
    <div className="Form-group">
      <label>{label}</label>

      {!loaded ? (
        <LoadingIndicator size="small" display="inline" />
      ) : (
        <Button
          className="Button RolevayaTagPickerButton"
          type="button"
          onclick={() =>
            app.modal.show(TagSelectionModal, {
              title: label,
              selectedTags: tag ? [tag] : [],
              allowResetting: false,
              limits: { min: { total: 1 }, max: { total: 1 } },
              onsubmit: (tags: any[]) => {
                const picked = tags[0];
                if (picked) onPick(picked);
              },
            })
          }
        >
          {tag ? (
            <span className="TagLabel" style={{ color: tag.color?.() || undefined }}>
              {tag.name?.() || slug}
            </span>
          ) : (
            <span className="TagLabel untagged">{slug || 'Выбрать тег…'}</span>
          )}
        </Button>
      )}

      {help ? <p className="helpText">{help}</p> : null}
    </div>
  );
}
