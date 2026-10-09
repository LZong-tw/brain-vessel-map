import { useEffect, useRef } from 'react';
import { DATA_SOURCES, INSPIRATIONS, SCIENTIFIC_REFERENCES } from '../anatomy/sources';
import { tr } from '../anatomy';
import { inlineText } from '../i18n/content';
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

function Modal({
  title,
  onClose,
  children,
  wide,
  closeLabel,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  closeLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', k);
    // keep keyboard and screen-reader focus inside the dialog, then give it back
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const backdrop = ref.current?.parentElement;
    const outside = backdrop?.parentElement ? [...backdrop.parentElement.children].filter((el) => el !== backdrop) : [];
    outside.forEach((el) => el.setAttribute('inert', ''));
    ref.current?.focus();
    return () => {
      window.removeEventListener('keydown', k);
      outside.forEach((el) => el.removeAttribute('inert'));
      opener?.focus();
    };
  }, []);
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
          <button className="icon-btn" onClick={onClose} aria-label={closeLabel}>
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
      <Modal title={t.disclaimerTitle} onClose={close} closeLabel={t.close}>
        {t.disclaimerBody.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <div className="emergency-box">
          <strong>{inlineText(lang, '119', '119', '急救', 'Notruf', '救急')}</strong>
          <span>{t.befastItems[5][1]}</span>
        </div>
        <button className="btn primary block" onClick={close}>
          {t.accept}
        </button>
      </Modal>
    );
  if (modal === 'befast')
    return (
      <Modal title={t.befastTitle} onClose={close} closeLabel={t.close}>
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
    <Modal title={t.sourcesTitle} onClose={close} closeLabel={t.close} wide>
      <section className="about">
        <h3>{inlineText(lang, "模型怎麼運作", "How the model works", "模型如何运作", "Wie das Modell funktioniert", "モデルの仕組み")}</h3>
        <p>
          {inlineText(lang, "腦表面由 MNI ICBM152 標準腦網格化而成。每個腦組織體素都被標上功能腦區（DKT 腦迴、視丘核團、腦幹分區）與動脈供應區（Liu 等人的圖譜），再組合成「灌流單位」。集總參數血流網路（Poiseuille 導管、Willis 環、軟腦膜與顱外側枝、腦血流自動調節）計算每個單位得到多少血；阻塞可以在不同時間開始、自行再通或之後惡化，每一段阻塞不變的時間各算一次。組織命運依照血流閾值隨時間變化，腦幹半影區死得較慢（依基底動脈取栓試驗校正）；治療在你選的時間與再灌流程度打通血管。水腫、疝脫、水腦、遠隔功能抑制與退化依文獻規則推估，恢復模型讓未受損的路徑代償一部分失去的功能。全部都是教學用的簡化。", "Brain surfaces are meshed from the MNI ICBM152 template. Every tissue voxel gets a functional region (DKT gyri, thalamic nuclei, brainstem sectors) and an arterial territory (Liu et al. atlas); voxels are grouped into perfusion beds. A lumped-parameter blood-flow network (Poiseuille conductances, circle of Willis, leptomeningeal and extracranial collaterals, cerebral autoregulation) computes the flow reaching each bed, for every stretch of the course in which the occlusions stay the same (occlusions can start, reopen by themselves or progress later). Tissue fate follows CBF thresholds over time, with a slower-dying brainstem penumbra calibrated to the basilar thrombectomy trials; treatment reopens the artery at the chosen time and grade. Oedema, herniation, hydrocephalus, diaschisis and degeneration follow published rules, and a recovery model lets spared pathways take over part of the lost functions. All of it is a teaching simplification.", "脑表面由 MNI ICBM152 标准脑网格化。每个组织体素都有功能区（DKT 脑回、丘脑核团、脑干分区）和动脉供血区（Liu 等图谱），再组成灌注单位。集总参数血流网络（Poiseuille 电导、大脑动脉环、软脑膜与颅外侧支、脑血流自动调节）计算每个单位的血流，在闭塞状态不变的每段病程分别计算（闭塞可开始、自行再通或后期进展）。组织结局取决于随时间变化的 CBF 阈值，脑干半暗带坏死较慢，按基底动脉血栓切除试验校准；治疗按选定时间和分级再通动脉。脑水肿、脑疝、脑积水、远隔功能抑制和变性按文献规则估计，恢复模型允许保留的传导路代偿部分丧失的功能。全部都是教学简化。", "Die Hirnoberflächen werden aus der MNI-ICBM152-Vorlage vernetzt. Jeder Gewebevoxel erhält eine funktionelle Region (DKT-Windungen, Thalamuskerne, Hirnstammsektoren) und ein arterielles Gebiet (Atlas von Liu et al.); Voxel werden zu Perfusionseinheiten zusammengefasst. Ein konzentriertes Blutflussmodell (Poiseuille-Leitwerte, Willis-Kreis, leptomeningeale und extrakranielle Kollateralen, zerebrale Autoregulation) berechnet den Fluss für jede Einheit in jedem Abschnitt mit unveränderten Verschlüssen. Diese können später beginnen, spontan rekanalisieren oder fortschreiten. Das Gewebeschicksal folgt zeitabhängigen CBF-Schwellen; die langsamer absterbende Hirnstammpenumbra ist an Basilaris-Thrombektomiestudien kalibriert. Die Behandlung rekanalisiert zur gewählten Zeit und zum gewählten Grad. Ödem, Herniation, Hydrozephalus, Diaschisis und Degeneration folgen publizierten Regeln; erhaltene Bahnen übernehmen im Erholungsmodell einen Teil verlorener Funktionen. Alles ist eine Vereinfachung zu Lehrzwecken.", "脳表面は MNI ICBM152 テンプレートからメッシュ化します。各組織ボクセルに機能領域（DKT 脳回、視床核、脳幹区分）と動脈領域（Liu らのアトラス）を付与し、灌流単位にまとめます。集中定数血流ネットワーク（Poiseuille コンダクタンス、ウィリス動脈輪、軟膜・頭蓋外側副血行、脳血流自動調節）が、閉塞状態の一定な各期間で単位ごとの血流を計算します。閉塞は後に開始、自然再開通、進行できます。組織の転帰は時間に伴う CBF 閾値に従い、脳幹ペナンブラの遅い壊死を脳底動脈血栓回収試験で調整します。治療は選択時点・グレードで再開通させます。浮腫、脳ヘルニア、水頭症、遠隔機能抑制、変性は公表規則に基づき、回復モデルでは残存経路が失われた機能の一部を代償します。すべて教育用の簡略化です。")}
        </p>
        <h3>{inlineText(lang, "資料（以衍生形式再散布）", "Data (redistributed in derived form)", "数据（以衍生形式再分发）", "Daten (in abgeleiteter Form weitergegeben)", "データ（派生形式で再配布）")}</h3>
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
                {s.modified ? (inlineText(lang, "已修改（網格化／重取樣／重新標記）", "modified (meshed / resampled / relabelled)", "已修改（网格化／重采样／重新标记）", "verändert (vernetzt / neu abgetastet / neu beschriftet)", "変更済み（メッシュ化／再サンプリング／再ラベル付け）")) : ''}
              </div>
              <div className="src-attr">{s.attribution}</div>
              {s.notice && <blockquote className="src-notice">{s.notice}</blockquote>}
              <Links urls={s.url} />
            </li>
          ))}
        </ul>
        <p className="muted">
          {inlineText(lang, "因動脈供應區圖譜採 CC BY-SA 4.0，衍生的資料檔（public/data、src/anatomy/generated）以 CC BY-SA 4.0 釋出；程式碼本身為 MIT 授權。", "Because the territory atlas is CC BY-SA 4.0, the derived data files (public/data, src/anatomy/generated) are shared under CC BY-SA 4.0. The application code is MIT-licensed.", "动脉供血区图谱采用 CC BY-SA 4.0，因此衍生数据文件（public/data、src/anatomy/generated）按 CC BY-SA 4.0 共享。应用程序代码采用 MIT 许可。", "Da der Gebietsatlas unter CC BY-SA 4.0 steht, werden die abgeleiteten Datendateien (public/data, src/anatomy/generated) unter CC BY-SA 4.0 geteilt. Der Anwendungscode ist MIT-lizenziert.", "動脈領域アトラスは CC BY-SA 4.0 のため、派生データ（public/data、src/anatomy/generated）は CC BY-SA 4.0 で共有します。アプリケーションコードは MIT ライセンスです。")}{' '}
          <a href="data/LICENSE.txt" target="_blank" rel="noopener noreferrer">
            {inlineText(lang, "資料授權全文", "Data licence", "数据许可全文", "Datenlizenz", "データライセンス")}
          </a>
          {' · '}
          <a href={`${REPO_URL}/blob/main/THIRD_PARTY_NOTICES.md`} target="_blank" rel="noopener noreferrer">
            THIRD_PARTY_NOTICES.md
          </a>
          {' · '}
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {inlineText(lang, "原始碼（MIT）", "Source code (MIT)", "源代码（MIT）", "Quellcode (MIT)", "ソースコード（MIT）")}
          </a>
        </p>
        <h3>{inlineText(lang, "參考與啟發的開源專案", "Projects that inspired parts of this app", "参考与启发本应用的开源项目", "Projekte als Anregung für Teile dieser App", "参考にしたオープンソースプロジェクト")}</h3>
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
        <h3>{inlineText(lang, "科學文獻", "Scientific references", "科学文献", "Wissenschaftliche Literatur", "科学文献")}</h3>
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
