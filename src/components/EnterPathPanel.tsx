type EnterPathIdleProps = {
  mode: 'idle'
}

type EnterPathFoundProps = {
  mode: 'found'
  provinceName: string
}

type EnterPathEnlistProps = {
  mode: 'enlist'
  provinceName: string
  houseName: string
}

export type EnterPathPanelProps =
  | EnterPathIdleProps
  | EnterPathFoundProps
  | EnterPathEnlistProps

export function EnterPathPanel(props: EnterPathPanelProps) {
  if (props.mode === 'idle') {
    return <p class="hint">灰色の中立国は建国、色の付いた国はその家へ仕官。</p>
  }

  if (props.mode === 'found') {
    return (
      <div class="enter-path">
        <label class="field">
          <span class="field-label">家名</span>
          <input
            class="field-input"
            type="text"
            name="houseName"
            maxlength={8}
            required
            autocomplete="organization"
            placeholder="例: 葵家"
          />
        </label>
        <p class="hint">{props.provinceName} で家を立て、当主となる。</p>
        <button type="submit" class="btn btn-primary">
          建国して戦国の世へ
        </button>
      </div>
    )
  }

  return (
    <div class="enter-path">
      <p class="hint">
        {props.houseName}（{props.provinceName}）に仕官する。
      </p>
      <button type="submit" class="btn btn-primary">
        仕官して戦国の世へ
      </button>
    </div>
  )
}
