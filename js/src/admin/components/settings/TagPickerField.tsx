import app from 'flarum/admin/app';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';

type Attrs = {
  label: string;
  help?: string;
  slug: string;
  tag: any | null;
  loaded: boolean;
  onPick: (tag: any) => void;
};

export default function TagPickerField(attrs: Attrs) {
  const { label, help, slug, tag, loaded, onPick } = attrs;

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
            app.modal.show(() => import('ext:flarum/tags/common/components/TagSelectionModal'), {
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
