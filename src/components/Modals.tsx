import { useEffect, useRef } from 'react';
import { DATA_SOURCES, INSPIRATIONS, SCIENTIFIC_REFERENCES } from '../anatomy/sources';
import { tr } from '../anatomy';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';

const REPO_URL = 'https://github.com/LZong-tw/brain-vessel-map';

function Links({ urls }: { urls: string }) {
  return (
    <div className="src-url">
      {urls.split(' · ').map((u, i) => (
        <span key={u}>
          {i > 0 && ' · '}
          <a href={u} target="_blank" rel="noopener noreferrer">
            {u.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        </span>
      ))}
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Modals() {
  const t = useT();
  const modal = useApp((s) => s.modal);
  const lang = useApp((s) => s.lang);
  const setModal = useApp((s) => s.setModal);
  const close = () => setModal('none');
  if (modal === 'none') return null;
  if (modal === 'disclaimer')
    return (
      <Modal title={t.disclaimerTitle} onClose={close}>
        {t.disclaimerBody.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <div className="emergency-box">
          <strong>119</strong>
          <span>{t.befastItems[5][1]}</span>
        </div>
        <button className="btn primary block" onClick={close}>
          {t.accept}
        </button>
      </Modal>
    );
  if (modal === 'befast')
    return (
      <Modal title={t.befastTitle} onClose={close}>
        <ul className="befast">
          {t.befastItems.map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong>
              <span>{v}</span>
            </li>
          ))}
        </ul>
        <p className="muted">{t.befastNote}</p>
        <button className="btn primary block" onClick={close}>
          {t.close}
        </button>
      </Modal>
    );
  return (
    <Modal title={t.sourcesTitle} onClose={close} wide>
      <section className="about">
        <h3>{lang === 'en' ? 'How the model works' : '模型怎麼運作'}</h3>
        <p>
          {lang === 'en'
            ? 'Brain surfaces are meshed from the MNI ICBM152 template. Every tissue voxel gets a functional region (DKT gyri, thalamic nuclei, brainstem sectors) and an arterial territory (Liu et al. atlas); voxels are grouped into perfusion beds. A lumped-parameter blood-flow network (Poiseuille conductances, circle of Willis, leptomeningeal and extracranial collaterals, cerebral autoregulation) computes the flow reaching each bed. Tissue fate follows CBF thresholds over time; downstream consequences (oedema, herniation, hydrocephalus, diaschisis, degeneration) follow published rules. All of it is a teaching simplification.'
            : '腦表面由 MNI ICBM152 標準腦網格化而成。每個腦組織體素都被標上功能腦區（DKT 腦迴、視丘核團、腦幹分區）與動脈供應區（Liu 等人的圖譜），再組合成「灌流單位」。集總參數血流網路（Poiseuille 導管、Willis 環、軟腦膜與顱外側枝、腦血流自動調節）計算每個單位得到多少血；組織命運依照血流閾值隨時間變化；後續的水腫、疝脫、水腦、遠隔功能抑制與退化則依文獻規則推估。全部都是教學用的簡化。'}
        </p>
        <h3>{lang === 'en' ? 'Data (redistributed in derived form)' : '資料（以衍生形式再散布）'}</h3>
        <ul className="sources">
          {DATA_SOURCES.map((s) => (
            <li key={s.id}>
              <div className="src-name">{s.name}</div>
              <div className="src-use">{tr(s.use, lang)}</div>
              <div className="src-lic">
                {s.licenceUrl ? (
                  <a className="badge" href={s.licenceUrl} target="_blank" rel="noopener noreferrer">
                    {s.licence}
                  </a>
                ) : (
                  <span className="badge">{s.licence}</span>
                )}{' '}
                {s.modified ? (lang === 'en' ? 'modified (meshed / resampled / relabelled)' : '已修改（網格化／重取樣／重新標記）') : ''}
              </div>
              <div className="src-attr">{s.attribution}</div>
              {s.notice && <blockquote className="src-notice">{s.notice}</blockquote>}
              <Links urls={s.url} />
            </li>
          ))}
        </ul>
        <p className="muted">
          {lang === 'en'
            ? 'Because the territory atlas is CC BY-SA 4.0, the derived data files (public/data, src/anatomy/generated) are shared under CC BY-SA 4.0. The application code is MIT-licensed.'
            : '因動脈供應區圖譜採 CC BY-SA 4.0，衍生的資料檔（public/data、src/anatomy/generated）以 CC BY-SA 4.0 釋出；程式碼本身為 MIT 授權。'}{' '}
          <a href="data/LICENSE.txt" target="_blank" rel="noopener noreferrer">
            {lang === 'en' ? 'Data licence' : '資料授權全文'}
          </a>
          {' · '}
          <a href={`${REPO_URL}/blob/main/THIRD_PARTY_NOTICES.md`} target="_blank" rel="noopener noreferrer">
            THIRD_PARTY_NOTICES.md
          </a>
          {' · '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {lang === 'en' ? 'Source code (MIT)' : '原始碼（MIT）'}
          </a>
        </p>
        <h3>{lang === 'en' ? 'Projects that inspired parts of this app' : '參考與啟發的開源專案'}</h3>
        <ul className="sources">
          {INSPIRATIONS.map((p) => (
            <li key={p.name}>
              <div className="src-name">
                {p.name} <span className="badge">{p.licence}</span>
              </div>
              <div className="src-use">{tr(p.note, lang)}</div>
              <Links urls={p.url} />
            </li>
          ))}
        </ul>
        <h3>{lang === 'en' ? 'Scientific references' : '科學文獻'}</h3>
        <ol className="refs">
          {SCIENTIFIC_REFERENCES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </section>
      <button className="btn primary block" onClick={close}>
        {t.close}
      </button>
    </Modal>
  );
}
