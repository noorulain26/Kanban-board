document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addBtn = document.getElementById('addTaskBtn');
    const modal = document.getElementById('taskModal');
    const closeModal = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const form = document.getElementById('taskForm');
    const tagOptions = document.querySelectorAll('.tag-option');
    const searchInput = document.getElementById('searchInput');

    // Form inputs
    const taskIdInput = document.getElementById('taskId');
    const titleInput = document.getElementById('taskTitle');
    const descInput = document.getElementById('taskDesc');
    const statusInput = document.getElementById('taskStatus');
    const priorityInput = document.getElementById('taskPriority');

    let draggedTask = null;

    // Load data from LocalStorage
    let tasks = JSON.parse(localStorage.getItem('kanban_tasks')) || [
        {
            id: 't-1',
            title: 'Design System Documentation',
            description: 'Create comprehensive guidelines for the UI kit including color palette, typography, and component states.',
            status: 'todo',
            priority: 'high',
            tags: ['UI/UX', 'Research'],
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        },
        {
            id: 't-2',
            title: 'Fix Navbar Responsive Issue',
            description: 'Hamburger menu doesn\'t toggle properly on mobile devices under 768px width.',
            status: 'in-progress',
            priority: 'urgent',
            tags: ['Bug'],
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
    ];

    // Initialization
    function init() {
        renderBoard();
        attachEventListeners();
    }

    // Save to LocalStorage
    function saveTasks() {
        localStorage.setItem('kanban_tasks', JSON.stringify(tasks));
        updateCounts();
    }

    // Modal behavior
    function openModal(task = null) {
        modal.classList.add('active');
        
        // Reset tags
        document.querySelectorAll('.tag-option').forEach(el => el.classList.remove('selected'));

        if (task) {
            document.getElementById('modalTitle').textContent = 'Edit Task';
            taskIdInput.value = task.id;
            titleInput.value = task.title;
            descInput.value = task.description;
            statusInput.value = task.status;
            priorityInput.value = task.priority;

            if (task.tags) {
                task.tags.forEach(tag => {
                    const tagEl = document.querySelector(`.tag-option[data-tag="${tag}"]`);
                    if (tagEl) tagEl.classList.add('selected');
                });
            }
        } else {
            document.getElementById('modalTitle').textContent = 'Add New Task';
            form.reset();
            taskIdInput.value = '';
        }
    }

    function closeTaskModal() {
        modal.classList.remove('active');
        setTimeout(() => form.reset(), 300);
    }

    // Tag Selection Logic
    tagOptions.forEach(tag => {
        tag.addEventListener('click', function() {
            this.classList.toggle('selected');
        });
    });

    function getSelectedTags() {
        const selected = Array.from(document.querySelectorAll('.tag-option.selected'));
        return selected.map(el => el.getAttribute('data-tag'));
    }

    // CRUD Operations
    function saveTask(e) {
        e.preventDefault();

        const id = taskIdInput.value;
        const newTask = {
            id: id || 't-' + Date.now(),
            title: titleInput.value,
            description: descInput.value,
            status: statusInput.value,
            priority: priorityInput.value,
            tags: getSelectedTags(),
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };

        if (id) {
            // Update
            const index = tasks.findIndex(t => t.id === id);
            if (index !== -1) tasks[index] = newTask;
        } else {
            // Create
            tasks.push(newTask);
        }

        saveTasks();
        renderBoard(searchInput.value);
        closeTaskModal();
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderBoard(searchInput.value);
    }

    // Render Board
    function renderBoard(filterText = '') {
        const columns = {
            'todo': document.getElementById('todo-list'),
            'in-progress': document.getElementById('in-progress-list'),
            'review': document.getElementById('review-list'),
            'done': document.getElementById('done-list')
        };

        // Clear columns
        Object.values(columns).forEach(col => {
            if (col) col.innerHTML = '';
        });

        tasks.forEach(task => {
            // Search Filtering
            if (filterText && !task.title.toLowerCase().includes(filterText.toLowerCase()) && 
                !task.description.toLowerCase().includes(filterText.toLowerCase())) {
                return;
            }

            const card = document.createElement('div');
            card.className = 'task-card';
            card.draggable = true;
            card.dataset.id = task.id;
            card.style.animation = 'fadeIn 0.3s ease forwards';

            // Priority label mapping
            const priorityLabels = {
                'low': 'Low',
                'medium': 'Medium',
                'high': 'High',
                'urgent': 'Urgent'
            };

            const tagsHTML = task.tags ? task.tags.map(t => `<span class="tag">${t}</span>`).join('') : '';

            card.innerHTML = `
                <div class="task-card-header">
                    <span class="task-priority priority-${task.priority}">${priorityLabels[task.priority]}</span>
                    <div class="task-actions">
                        <button class="icon-btn edit-btn"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="icon-btn delete-btn"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <h4 class="task-title">${task.title}</h4>
                <p class="task-desc">${task.description}</p>
                <div class="task-footer">
                    <div class="task-tags">${tagsHTML}</div>
                    <div class="task-date"><i class="fa-regular fa-clock"></i> ${task.date}</div>
                </div>
            `;

            // Card Event Listeners
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragend', handleDragEnd);

            // Open modal on entire card click
            card.addEventListener('click', (e) => {
                // Ignore clicks on actionable items inside the card
                if (e.target.closest('.delete-btn') || e.target.closest('.edit-btn')) {
                    return;
                }
                openModal(task);
            });

            card.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(task);
            });
            card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTask(task.id);
            });

            if (columns[task.status]) {
                columns[task.status].appendChild(card);
            }
        });

        updateCounts();
    }

    function updateCounts() {
        const counts = { 'todo': 0, 'in-progress': 0, 'review': 0, 'done': 0 };
        tasks.forEach(t => {
            if(counts[t.status] !== undefined) counts[t.status]++;
        });

        for (const [status, count] of Object.entries(counts)) {
            const el = document.getElementById(`${status}-count`);
            if (el) el.textContent = count;
        }
    }

    // Drag and Drop implementation
    function handleDragStart(e) {
        draggedTask = this;
        setTimeout(() => this.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.id);
    }

    function handleDragEnd() {
        draggedTask.classList.remove('dragging');
        draggedTask = null;
        document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // Add drag-over feedback
        const column = e.target.closest('.kanban-column');
        if (column && !column.classList.contains('drag-over')) {
            document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
            column.classList.add('drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const column = e.target.closest('.kanban-column');
        
        if (column && draggedTask) {
            column.classList.remove('drag-over');
            const newStatus = column.dataset.status;
            
            const list = column.querySelector('.task-list');
            list.appendChild(draggedTask);
            
            // Update state
            const id = draggedTask.dataset.id;
            const taskIndex = tasks.findIndex(t => t.id === id);
            
            if (taskIndex !== -1 && tasks[taskIndex].status !== newStatus) {
                tasks[taskIndex].status = newStatus;
                saveTasks();
                updateCounts();
            }
        }
    }

    // Listeners Binding
    function attachEventListeners() {
        addBtn.addEventListener('click', () => openModal());
        closeModal.addEventListener('click', closeTaskModal);
        cancelBtn.addEventListener('click', closeTaskModal);
        form.addEventListener('submit', saveTask);

        // Click outside to close modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeTaskModal();
        });

        document.querySelectorAll('.kanban-column').forEach(col => {
            col.addEventListener('dragover', handleDragOver);
            col.addEventListener('drop', handleDrop);
            col.addEventListener('dragenter', e => e.preventDefault());
        });

        // Search listener
        searchInput.addEventListener('input', (e) => {
            renderBoard(e.target.value);
        });
    }

    // Fire it up
    init();
});
