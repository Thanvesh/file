let directoryHandle;
let currentPath = [];
let folderStructure = [];

document.getElementById('pick-directory').onclick = async () => {
    directoryHandle = await window.showDirectoryPicker();
    currentPath = [{ name: 'root', handle: directoryHandle }];
    folderStructure = await convertDirectoryToJSON(directoryHandle, 'root');
    updateBreadcrumb();
    renderFolderView();
};




async function convertDirectoryToJSON(directoryHandle, path) {
    const items = [];
    for await (const [name, handle] of directoryHandle.entries()) {
        const itemPath = `${path}/${name}`;
        if (handle.kind === 'directory') {
            const children = await convertDirectoryToJSON(handle, itemPath);
            items.push({
                path: itemPath,
                name: name,
                type: 'directory',
                handle: handle,
                children: children,
                selected: false,
                indeterminate: false
            });
        } else {
            items.push({
                path: itemPath,
                name: name,
                type: 'file',
                handle: handle,
                selected: false,
                indeterminate: false
            });
        }
    }
    return items;
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '';
    currentPath.forEach((folder, index) => {
        const span = document.createElement('span');
        span.textContent = folder.name;
        span.classList.add('breadcrumb-item');
        span.onclick = () => navigateTo(index);
        breadcrumb.appendChild(span);
        if (index < currentPath.length - 1) {
            breadcrumb.appendChild(document.createTextNode(' > '));
        }
    });
}

function navigateTo(index) {
    currentPath = currentPath.slice(0, index+1);

    renderFolderView();
}

async function renderFolderView() {
    const folderList = document.getElementById('folder-list');
    folderList.innerHTML = '';

      // Create the "Select All" checkbox
      const selectAllLi = document.createElement('li');
      const selectAllCheckbox = document.createElement('input');
      selectAllCheckbox.type = 'checkbox';
      selectAllCheckbox.id = 'select-all-left';


    const currentPathStr = getCurrentPathString();
    const currentDirNode = findNodeByPath(folderStructure, currentPathStr);

    if (!currentDirNode) return;

    selectAllCheckbox.onchange = (e) => handleSelectAllChange(e, currentDirNode.children);
    selectAllLi.classList.add('select-all-label');


    selectAllLi.appendChild(selectAllCheckbox);
    selectAllLi.appendChild(document.createTextNode('Select All'));


    folderList.appendChild(selectAllLi);

    for (const item of currentDirNode.children) {
        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';

        

        checkbox.checked = item.selected;
        checkbox.indeterminate = item.indeterminate;

        checkbox.onchange = (e) => handleCheckboxChange(e, item);
        li.appendChild(checkbox);

        const span = document.createElement('span');

        const icon = document.createElement('i');
        icon.classList.add('fa', item.type === 'file' ? 'fa-file' : 'fa-folder-open');

        // Append the icon to the span
        span.appendChild(icon);

        // Append the file/folder name to the span
        span.appendChild(document.createTextNode('   ' +" "+ item.name));

        

        // Append the icon to the span
        span.classList.add('folder-item', item.type === 'file' ? 'fileicon' : 'foldericon');
        
        span.onclick = async () => {
            if (item.type === 'directory') {
                currentPath.push({ name: item.name, handle: item.handle });
                updateBreadcrumb();
                renderFolderView();

            }
        };

        li.appendChild(span);
        folderList.appendChild(li);
    }

    updateSelectAllState(); // Update the "Select All" checkbox state

}

function handleSelectAllChange(event, items) {
    const isChecked = event.target.checked;

    items.forEach(async item => {
        if (isChecked) {
            await selectItemAndContents(item);
        } else {
            deselectItemAndContents(item);
        }
    });

    updateSelectionStates();
    renderFolderView();
    renderSelectedView();
  
    const selectAllCheckbox = document.getElementById('select-all-left');
    selectAllCheckbox.checked = isChecked;
    selectAllCheckbox.indeterminate = false;

   
}

function updateSelectAllState() {
    const folderList = document.getElementById('folder-list');
    const checkboxes = folderList.querySelectorAll('input[type="checkbox"]:not(#select-all-left)');
    const totalCheckboxes = checkboxes.length;
    const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked).length;

    const selectAllCheckbox = document.getElementById('select-all-left');
    if (selectedCheckboxes === totalCheckboxes) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (selectedCheckboxes > 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
}
function updateSelectAllRightState() {
    const selectedList = document.getElementById('selected-list');
    const checkboxes = selectedList.querySelectorAll('input[type="checkbox"]:not(#select-all-left)');
    const totalCheckboxes = checkboxes.length;
    const selectedCheckboxes = Array.from(checkboxes).filter(cb => cb.checked).length;

    const selectAllRightCheckbox = document.getElementById('select-all-right');
    if (totalCheckboxes === 0) {
        selectAllRightCheckbox.checked = false;
        selectAllRightCheckbox.indeterminate = false;
        return;
    }
    if (selectedCheckboxes === totalCheckboxes) {
        selectAllRightCheckbox.checked = true;
        selectAllRightCheckbox.indeterminate = false;
    } else if (selectedCheckboxes > 0) {
        selectAllRightCheckbox.checked = false;
        selectAllRightCheckbox.indeterminate = true;
    } else {
        selectAllRightCheckbox.checked = false;
        selectAllRightCheckbox.indeterminate = false;
    }
}


function getCurrentPathString() {
    return currentPath.map(folder => folder.name).join('/');
}

function getSelectionState(node) {
    if (node.type === 'directory') {
        const childTotal = node.children ? node.children.length : 0;
        const childSelected = node.children ? node.children.filter(child => child.selected).length : 0;

        if (childSelected === 0) {
            node.selected = false;
            node.indeterminate = false;
        } else if (childSelected === childTotal) {
            node.selected = true;
            node.indeterminate = false;
        } else {
            node.selected = false;
            node.indeterminate = true;
        }
    } else {
        node.indeterminate = false;
    }
}




function findNodeByPath(nodeList, path) {
    if(path == "root") {
        return {
            path: 'root',
            name: 'root',
            type: 'directory',
            handle: currentPath.handle,
            children: nodeList
        };
    }
    for (const node of nodeList) {
        if (node.path === path) return node;
        if (node.children) {
            const result = findNodeByPath(node.children, path);
            if (result) return result;
        }
    }
    return null;
}

async function handleCheckboxChange(event, item) {
    if (event.target.checked) {
        await selectItemAndContents(item);
    } else {
        deselectItemAndContents(item);
    }
    updateSelectionStates();
    renderSelectedView();
    renderFolderView();
}

// function selectItemAndContents(item, forceSelect = false) {
//     const node = findNodeByPath(folderStructure, item.path);
//     console.log(node)
//     if (node) {
//         node.selected = true;
//         node.indeterminate = false; // Ensure the folder is not indeterminate



//         if (node.type === 'directory' && node.children) {
//             node.selected=true
//             node.indeterminate=false
//             for (const child of node.children) {
//                 selectItemAndContents(child, true); // Force full selection for all children
//             }
//         }
//         const parentNode = findParentNodeByPath(folderStructure, node.path);
//         if (parentNode) {
//             updateNodeState(parentNode);
//         }
//     }
// }

function selectItemAndContents(item, forceSelect = false) {
    const node = findNodeByPath(folderStructure, item.path);
    if (node) {
        // Ensure the folder is not indeterminate
        node.selected = true;
        node.indeterminate = false;

        // If the node is a directory
        if (node.type === 'directory' && node.children) {
            // If forceSelect is true or the node is fully checked
            if (forceSelect || node.selected && !node.indeterminate) {
                node.selected = true;
                node.indeterminate = false;

                // Recursively select all children
                for (const child of node.children) {
                    selectItemAndContents(child, true);
                }
            } else {
                // If the node is in an indeterminate state, select individual items
                for (const child of node.children) {
                    selectItemAndContents(child);
                }
            }
        }
        
        // Update the parent node state
        const parentNode = findParentNodeByPath(folderStructure, node.path);
        if (parentNode) {
            updateNodeState(parentNode);
        }
    }
}

function findParentNodeByPath(nodeList, childPath) {
    for (const node of nodeList) {
        if (node.children && node.children.some(child => child.path === childPath)) {
            return node;
        }
        if (node.children) {
            const parent = findParentNodeByPath(node.children, childPath);
            if (parent) return parent;
        }
    }
    return null;
}

function deselectItemAndContents(item) {
    const node = findNodeByPath(folderStructure, item.path);
    if (node) {
        node.selected = false;
        node.indeterminate= false;

        if (node.type === 'directory') {
            for (const child of node.children) {
                deselectItemAndContents(child);
            }
        }
        

        const parentNode = findParentNodeByPath(folderStructure, node.path);
        if (parentNode) {
            updateNodeState(parentNode);
        }
        console.log(node)

    }
}

function  deselectItemAndContentstwo(item){

    const node = findNodeByPath(folderStructure, item.path);

        node.selected = false;
        node.indeterminate= false;

        if (node.type === 'directory') {
            for (const child of node.children) {
                deselectItemAndContents(child);
            }
        }


}

function updateSelectionStates() {
    folderStructure.forEach(updateNodeState);
    renderFolderView();  // Make sure the folder view reflects the correct state
    renderSelectedView();
}

function updateNodeState(node) {
    if (node.type === 'directory' && node.children) {
        node.children.forEach(updateNodeState);
    }
    getSelectionState(node);  // Make sure to update the node's state based on its children
}

function renderSelectedView() {
    const selectedList = document.getElementById('selected-list');
    selectedList.innerHTML = '';
    console.log(folderStructure)
    renderSelectedNodes(folderStructure, selectedList);
    updateSelectAllRightState()


}

function renderSelectedNodes(nodes, parentElement) {
    nodes.forEach(node => {
        if (node.selected && !node.indeterminate) {
            // Add the folder itself when it's fully checked
            if (node.type === 'directory'|| node.type=='file') {
                const li = document.createElement('li');
                selected=true
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';              
                checkbox.onchange = (e) => handleRightCheckboxChange(e, node);
                checkbox.checked=false
                li.appendChild(checkbox);
                li.appendChild(document.createTextNode(node.path));
                parentElement.appendChild(li);
            }
        } if (node.children && node.indeterminate) {
            // Add individual items when the folder is in an indeterminate state
            node.children.forEach(child => {
                if (child.selected) {
                    const li = document.createElement('li');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked=false
                    selected=true
                    checkbox.onchange = (e) => handleRightCheckboxChange(e, child);
                    li.appendChild(checkbox);
                    li.appendChild(document.createTextNode(child.path));
                    parentElement.appendChild(li);
                }
            });
        }
        
    });
    

}

async function handleRightCheckboxChange(event, node) {
    if (event.target.checked) {
        await selectItemAndContents(node); // Select item and its contents
        node.selected = true;

        node.checked=true

    } else {

        node.checked=false
    }
    updateSelectAllRightState()
    


 

}
document.getElementById('select-all-right').onclick = async(e) => {
    const check = e.target.checked;
    const selectedList = document.getElementById('selected-list');
    const checkboxes = selectedList.querySelectorAll('input[type="checkbox"]:not(#select-all-right)');

    for (const checkbox of checkboxes) {
        const itemPath = checkbox.nextSibling.textContent.trim();
        const item = findNodeByPath(folderStructure, itemPath);
        console.log("selectall",item)
        if (item) {
            if (check) {
                item.checked=true
                checkbox.checked=true
               await selectItemAndContents(item, true); // Select item and all its contents
            } else {
                item.checked = false;
                checkbox.checked=false
            }
        }
    }

    updateSelectAllRightState(); // Update the select-all-right checkbox state
};




document.getElementById('remove-selected').onclick = () => {
    const selectedList = document.getElementById('selected-list');
    const checkboxes = selectedList.querySelectorAll('input[type="checkbox"]:not(#select-all-right)');

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const itemPath = checkbox.nextSibling.textContent.trim();
            const item = findNodeByPath(folderStructure, itemPath);
            if (item && item.checked) {
                deselectItemAndContentstwo(item);
                item.checked=false
            }

        }
    });

    updateSelectionStates(); // Update the selection states in the folder structure
};
