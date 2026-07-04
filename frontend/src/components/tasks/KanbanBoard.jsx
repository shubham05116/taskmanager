import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI } from '../../services/api';
import useToastStore from '../../store/toastStore';
import TaskCard from './TaskCard.jsx';
import CreateTaskModal from './CreateTaskModal.jsx';
import TaskDetailModal from './TaskDetailModal.jsx';
import { Plus, Circle } from 'lucide-react';

const COLUMNS = [
  { key:'todo', label:'To Do', color:'#94a3b8' },
  { key:'in_progress', label:'In Progress', color:'#3b82f6' },
  { key:'in_review', label:'In Review', color:'#f59e0b' },
  { key:'done', label:'Done', color:'#10b981' },
];

export default function KanbanBoard({ project }) {
  const [createStatus, setCreateStatus] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const qc = useQueryClient();
  const toast = useToastStore();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', String(project.id)],
    queryFn: () => tasksAPI.listByProject(project.id).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => tasksAPI.update(id, data),
    onSuccess: () => qc.invalidateQueries(['tasks', String(project.id)]),
    onError: () => toast.error('Failed to update task'),
  });

  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.style.background = '#f0f4ff'; };
  const handleDragLeave = (e) => { e.currentTarget.style.background = ''; };
  const handleDrop = (e, status) => {
    e.currentTarget.style.background = '';
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== status) {
      updateMutation.mutate({ id: taskId, data: { status } });
    }
  };

  const getColumnTasks = (status) => tasks.filter(t => t.status === status);

  if (isLoading) return <div style={{ padding:20, color:'#94a3b8' }}>Loading board...</div>;

  return (
    <div style={styles.board}>
      {COLUMNS.map(col => {
        const colTasks = getColumnTasks(col.key);
        return (
          <div key={col.key} style={styles.column}
               onDragOver={handleDragOver}
               onDragLeave={handleDragLeave}
               onDrop={e => handleDrop(e, col.key)}>
            {/* Column header */}
            <div style={styles.colHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <Circle size={9} fill={col.color} color={col.color} />
                <span style={{ fontWeight:600, fontSize:13 }}>{col.label}</span>
                <span style={styles.count}>{colTasks.length}</span>
              </div>
              <button className="btn-icon" title={`Add ${col.label} task`}
                      onClick={() => setCreateStatus(col.key)} style={{ padding:3 }}>
                <Plus size={15} />
              </button>
            </div>

            {/* Tasks */}
            <div style={styles.taskList}>
              {colTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
              ))}
              {colTasks.length === 0 && (
                <div style={styles.emptyCol}>
                  <p>No tasks</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCreateStatus(col.key)}>
                    <Plus size={13} /> Add task
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {createStatus && (
        <CreateTaskModal
          projectId={project.id}
          initialStatus={createStatus}
          onClose={() => setCreateStatus(null)}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          projectId={project.id}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updated) => setSelectedTask(updated)}
        />
      )}
    </div>
  );
}

const styles = {
  board: { display:'flex', gap:14, overflowX:'auto', paddingBottom:16, minHeight:500 },
  column: { flex:'0 0 270px', background:'#f8fafc', borderRadius:12, padding:'12px 10px', display:'flex', flexDirection:'column', gap:8, minHeight:200, transition:'background 0.15s', border:'1px solid #e2e8f0' },
  colHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'2px 4px', marginBottom:4 },
  count: { background:'#e2e8f0', color:'#475569', borderRadius:999, padding:'0px 7px', fontSize:11, fontWeight:700 },
  taskList: { display:'flex', flexDirection:'column', gap:8, flex:1 },
  emptyCol: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 8px', color:'#94a3b8', fontSize:13, gap:6 },
};
