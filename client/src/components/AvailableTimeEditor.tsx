import { useState, useCallback } from 'react'
import type { TimeSlotConfig, SlotType } from '../services/api'

const WEEKDAYS = [
  { key: 'Mon', label: '월요일' },
  { key: 'Tue', label: '화요일' },
  { key: 'Wed', label: '수요일' },
  { key: 'Thu', label: '목요일' },
  { key: 'Fri', label: '금요일' },
  { key: 'Sat', label: '토요일' },
  { key: 'Sun', label: '일요일' },
] as const

const SLOT_TYPE_OPTIONS: { value: SlotType; label: string; color: string }[] = [
  { value: 'any', label: '전체', color: 'bg-gray-100 text-gray-700' },
  { value: 'routine', label: '루틴', color: 'bg-green-100 text-green-700' },
  { value: 'project', label: '프로젝트', color: 'bg-blue-100 text-blue-700' },
]

interface AvailableTimeEditorProps {
  available: Record<string, TimeSlotConfig[]>
  onChange: (available: Record<string, TimeSlotConfig[]>) => void
  disabled?: boolean
}

/**
 * Editor component for configuring available time slots per weekday.
 * Allows adding, editing, removing time ranges and setting slot types.
 */
export default function AvailableTimeEditor({
  available,
  onChange,
  disabled = false
}: AvailableTimeEditorProps) {
  const [editingSlot, setEditingSlot] = useState<{ day: string; index: number } | null>(null)
  const [newSlot, setNewSlot] = useState<{ day: string } | null>(null)
  const [tempStart, setTempStart] = useState('')
  const [tempEnd, setTempEnd] = useState('')
  const [tempType, setTempType] = useState<SlotType>('any')

  // 레거시 포맷(string) 또는 새 포맷(TimeSlotConfig) 처리
  const normalizeSlot = (slot: string | TimeSlotConfig): TimeSlotConfig => {
    if (typeof slot === 'string') {
      return { time: slot, type: 'any' }
    }
    return slot
  }

  // 시간순으로 슬롯 정렬
  const sortSlotsByTime = (slots: TimeSlotConfig[]): TimeSlotConfig[] => {
    return [...slots].sort((a, b) => {
      const startA = a.time.split('-')[0]
      const startB = b.time.split('-')[0]
      return startA.localeCompare(startB)
    })
  }

  const handleAddSlot = useCallback((day: string) => {
    setNewSlot({ day })
    setTempStart('09:00')
    setTempEnd('10:00')
    setTempType('any')
    setEditingSlot(null)
  }, [])

  const handleEditSlot = useCallback((day: string, index: number) => {
    const slots = available[day] || []
    const slot = normalizeSlot(slots[index])
    if (slot) {
      const [start, end] = slot.time.split('-')
      setTempStart(start)
      setTempEnd(end)
      setTempType(slot.type)
      setEditingSlot({ day, index })
      setNewSlot(null)
    }
  }, [available])

  const handleSaveSlot = useCallback(() => {
    if (!tempStart || !tempEnd) return

    const newSlotValue: TimeSlotConfig = {
      time: `${tempStart}-${tempEnd}`,
      type: tempType
    }

    if (editingSlot) {
      const { day, index } = editingSlot
      const slots = [...(available[day] || [])].map(normalizeSlot)
      slots[index] = newSlotValue
      // 시간순 정렬 후 저장
      onChange({ ...available, [day]: sortSlotsByTime(slots) })
      setEditingSlot(null)
    } else if (newSlot) {
      const { day } = newSlot
      const slots = [...(available[day] || [])].map(normalizeSlot)
      slots.push(newSlotValue)
      // 시간순 정렬 후 저장
      onChange({ ...available, [day]: sortSlotsByTime(slots) })
      setNewSlot(null)
    }

    setTempStart('')
    setTempEnd('')
    setTempType('any')
  }, [available, editingSlot, newSlot, tempStart, tempEnd, tempType, onChange])

  const handleCancelEdit = useCallback(() => {
    setEditingSlot(null)
    setNewSlot(null)
    setTempStart('')
    setTempEnd('')
    setTempType('any')
  }, [])

  const handleRemoveSlot = useCallback((day: string, index: number) => {
    const slots = [...(available[day] || [])].map(normalizeSlot)
    slots.splice(index, 1)
    onChange({ ...available, [day]: slots })
  }, [available, onChange])

  const handleTypeChange = useCallback((day: string, index: number, newType: SlotType) => {
    const slots = [...(available[day] || [])].map(normalizeSlot)
    slots[index] = { ...slots[index], type: newType }
    onChange({ ...available, [day]: slots })
  }, [available, onChange])

  const isEditing = (day: string, index: number) => {
    return editingSlot?.day === day && editingSlot?.index === index
  }

  const isAddingNew = (day: string) => {
    return newSlot?.day === day
  }

  const getTypeStyle = (type: SlotType) => {
    return SLOT_TYPE_OPTIONS.find(opt => opt.value === type)?.color || 'bg-gray-100 text-gray-700'
  }

  const getTypeLabel = (type: SlotType) => {
    return SLOT_TYPE_OPTIONS.find(opt => opt.value === type)?.label || '전체'
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-sm font-medium text-gray-900">가용 시간</h3>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          각 시간대에 배치할 항목 유형을 설정할 수 있습니다
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {WEEKDAYS.map(({ key, label }) => {
          const slots = (available[key] || []).map(normalizeSlot)

          return (
            <div key={key} className="px-4 py-3">
              <div className="flex items-start gap-4">
                {/* Day Label */}
                <div className="w-16 flex-shrink-0 pt-1.5">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>

                {/* Time Slots */}
                <div className="flex-1 space-y-2">
                  {slots.length === 0 && !isAddingNew(key) && (
                    <p className="py-1.5 text-sm text-gray-400">시간 없음</p>
                  )}

                  {slots.map((slot, index) => {
                    const [start, end] = slot.time.split('-')

                    if (isEditing(key, index)) {
                      // Edit mode
                      return (
                        <TimeSlotEditor
                          key={index}
                          start={tempStart}
                          end={tempEnd}
                          type={tempType}
                          onStartChange={setTempStart}
                          onEndChange={setTempEnd}
                          onTypeChange={setTempType}
                          onSave={handleSaveSlot}
                          onCancel={handleCancelEdit}
                          disabled={disabled}
                        />
                      )
                    }

                    // View mode
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2"
                      >
                        <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                          {start} - {end}
                        </span>
                        {/* Slot Type Selector */}
                        <select
                          value={slot.type}
                          onChange={(e) => handleTypeChange(key, index, e.target.value as SlotType)}
                          disabled={disabled || editingSlot !== null || newSlot !== null}
                          className={`rounded-lg px-2 py-1 text-xs font-medium ${getTypeStyle(slot.type)} border-0 focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
                        >
                          {SLOT_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleEditSlot(key, index)}
                          disabled={disabled || editingSlot !== null || newSlot !== null}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                          aria-label={`${label} ${slot.time} 수정`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(key, index)}
                          disabled={disabled || editingSlot !== null || newSlot !== null}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          aria-label={`${label} ${slot.time} 삭제`}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}

                  {/* New Slot Editor */}
                  {isAddingNew(key) && (
                    <TimeSlotEditor
                      start={tempStart}
                      end={tempEnd}
                      type={tempType}
                      onStartChange={setTempStart}
                      onEndChange={setTempEnd}
                      onTypeChange={setTempType}
                      onSave={handleSaveSlot}
                      onCancel={handleCancelEdit}
                      disabled={disabled}
                    />
                  )}

                  {/* Add Button */}
                  {!isAddingNew(key) && !editingSlot && (
                    <button
                      type="button"
                      onClick={() => handleAddSlot(key)}
                      disabled={disabled || editingSlot !== null || newSlot !== null}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>추가</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface TimeSlotEditorProps {
  start: string
  end: string
  type: SlotType
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  onTypeChange: (value: SlotType) => void
  onSave: () => void
  onCancel: () => void
  disabled?: boolean
}

function TimeSlotEditor({
  start,
  end,
  type,
  onStartChange,
  onEndChange,
  onTypeChange,
  onSave,
  onCancel,
  disabled
}: TimeSlotEditorProps) {
  const isValid = start && end && start < end

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="time"
        value={start}
        onChange={(e) => onStartChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        aria-label="시작 시간"
      />
      <span className="text-gray-400">-</span>
      <input
        type="time"
        value={end}
        onChange={(e) => onEndChange(e.target.value)}
        disabled={disabled}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        aria-label="종료 시간"
      />
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value as SlotType)}
        disabled={disabled}
        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        aria-label="슬롯 타입"
      >
        {SLOT_TYPE_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={onSave}
        disabled={disabled || !isValid}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        저장
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        취소
      </button>
    </div>
  )
}
