const questions = [
  {
    id: 1,
    question: "What is the time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correct: 1,
    topic: "Searching"
  },
  {
    id: 2,
    question: "Which data structure uses LIFO principle?",
    options: ["Queue", "Stack", "Array", "Linked List"],
    correct: 1,
    topic: "Data Structures"
  },
  {
    id: 3,
    question: "What is the worst-case time complexity of QuickSort?",
    options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"],
    correct: 2,
    topic: "Sorting"
  },
  {
    id: 4,
    question: "Which traversal of a BST gives sorted output?",
    options: ["Preorder", "Postorder", "Inorder", "Level order"],
    correct: 2,
    topic: "Trees"
  },
  {
    id: 5,
    question: "What data structure is used in BFS?",
    options: ["Stack", "Queue", "Heap", "Array"],
    correct: 1,
    topic: "Graphs"
  },
  {
    id: 6,
    question: "Hash table average-case lookup time complexity?",
    options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
    correct: 2,
    topic: "Hashing"
  },
  {
    id: 7,
    question: "Which algorithm finds shortest path in weighted graph?",
    options: ["DFS", "BFS", "Dijkstra's", "Kruskal's"],
    correct: 2,
    topic: "Graphs"
  },
  {
    id: 8,
    question: "What is the space complexity of merge sort?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
    correct: 2,
    topic: "Sorting"
  },
  {
    id: 9,
    question: "Which data structure uses FIFO principle?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    correct: 1,
    topic: "Data Structures"
  },
  {
    id: 10,
    question: "Time complexity to access an element in array by index?",
    options: ["O(n)", "O(log n)", "O(1)", "O(n log n)"],
    correct: 2,
    topic: "Arrays"
  },
  {
    id: 11,
    question: "What is a complete binary tree?",
    options: [
      "All leaves at same level",
      "Every node has 2 children",
      "All levels filled except possibly last",
      "Only left children exist"
    ],
    correct: 2,
    topic: "Trees"
  },
  {
    id: 12,
    question: "Which sorting algorithm is stable?",
    options: ["QuickSort", "HeapSort", "Merge Sort", "Selection Sort"],
    correct: 2,
    topic: "Sorting"
  },
  {
    id: 13,
    question: "Worst-case time for inserting into a hash table?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
    correct: 2,
    topic: "Hashing"
  },
  {
    id: 14,
    question: "What is the height of a balanced BST with n nodes?",
    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    correct: 1,
    topic: "Trees"
  },
  {
    id: 15,
    question: "Which algorithm detects a cycle in a linked list?",
    options: ["Binary Search", "Floyd's Cycle Detection", "DFS", "BFS"],
    correct: 1,
    topic: "Linked Lists"
  },
  {
    id: 16,
    question: "Time complexity of inserting at the beginning of a linked list?",
    options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
    correct: 2,
    topic: "Linked Lists"
  },
  {
    id: 17,
    question: "What does DFS use internally?",
    options: ["Queue", "Stack", "Heap", "Hash Map"],
    correct: 1,
    topic: "Graphs"
  },
  {
    id: 18,
    question: "Which is NOT a greedy algorithm?",
    options: ["Kruskal's", "Prim's", "Dijkstra's", "Floyd-Warshall"],
    correct: 3,
    topic: "Algorithms"
  },
  {
    id: 19,
    question: "Best case time complexity of bubble sort?",
    options: ["O(n²)", "O(n log n)", "O(n)", "O(1)"],
    correct: 2,
    topic: "Sorting"
  },
  {
    id: 20,
    question: "What is the maximum number of edges in a simple undirected graph with n vertices?",
    options: ["n", "n-1", "n(n-1)/2", "n²"],
    correct: 2,
    topic: "Graphs"
  },
  {
    id: 21,
    question: "Which data structure is used in recursion internally?",
    options: ["Queue", "Stack", "Heap", "Graph"],
    correct: 1,
    topic: "Data Structures"
  },
  {
    id: 22,
    question: "Time complexity of heapify operation?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correct: 1,
    topic: "Heaps"
  },
  {
    id: 23,
    question: "What is the output of postorder traversal of expression tree for (a+b)*c?",
    options: ["*+abc", "ab+c*", "abc+*", "a+b*c"],
    correct: 1,
    topic: "Trees"
  },
  {
    id: 24,
    question: "Which problem is solved using dynamic programming?",
    options: ["Binary Search", "0/1 Knapsack", "Linear Search", "BFS"],
    correct: 1,
    topic: "Dynamic Programming"
  },
  {
    id: 25,
    question: "Number of comparisons in linear search (worst case)?",
    options: ["1", "log n", "n", "n²"],
    correct: 2,
    topic: "Searching"
  },
  {
    id: 26,
    question: "What is the degree of a leaf node?",
    options: ["0", "1", "2", "Depends on tree"],
    correct: 0,
    topic: "Trees"
  },
  {
    id: 27,
    question: "Which data structure is best for implementing a priority queue?",
    options: ["Array", "Linked List", "Heap", "Stack"],
    correct: 2,
    topic: "Heaps"
  },
  {
    id: 28,
    question: "Time complexity of counting sort?",
    options: ["O(n log n)", "O(n²)", "O(n + k)", "O(n)"],
    correct: 2,
    topic: "Sorting"
  },
  {
    id: 29,
    question: "What is topological sorting used for?",
    options: [
      "Sorting an array",
      "Ordering tasks with dependencies",
      "Finding shortest path",
      "Balancing a tree"
    ],
    correct: 1,
    topic: "Graphs"
  },
  {
    id: 30,
    question: "Which technique is used in Huffman coding?",
    options: ["Dynamic Programming", "Divide and Conquer", "Greedy", "Backtracking"],
    correct: 2,
    topic: "Algorithms"
  },
  {
    id: 31,
    question: "What is an AVL tree?",
    options: [
      "Binary tree with same height subtrees",
      "Self-balancing BST with height diff ≤ 1",
      "Tree with 2 children per node",
      "Complete binary tree"
    ],
    correct: 1,
    topic: "Trees"
  },
  {
    id: 32,
    question: "Time complexity of building a heap from an array?",
    options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"],
    correct: 1,
    topic: "Heaps"
  },
  {
    id: 33,
    question: "Which traversal is used to create a copy of a tree?",
    options: ["Inorder", "Preorder", "Postorder", "Level order"],
    correct: 1,
    topic: "Trees"
  },
  {
    id: 34,
    question: "What is the time complexity of Kruskal's algorithm?",
    options: ["O(V²)", "O(E log E)", "O(V + E)", "O(E)"],
    correct: 1,
    topic: "Graphs"
  },
  {
    id: 35,
    question: "Which data structure is used in LRU cache?",
    options: [
      "Array + Stack",
      "HashMap + Doubly Linked List",
      "Queue + Array",
      "Heap + HashMap"
    ],
    correct: 1,
    topic: "Data Structures"
  },
  {
    id: 36,
    question: "Amortized time complexity of dynamic array insertion?",
    options: ["O(n)", "O(1)", "O(log n)", "O(n²)"],
    correct: 1,
    topic: "Arrays"
  },
  {
    id: 37,
    question: "Which problem cannot be solved using greedy approach optimally?",
    options: ["Activity Selection", "0/1 Knapsack", "Fractional Knapsack", "Job Scheduling"],
    correct: 1,
    topic: "Dynamic Programming"
  },
  {
    id: 38,
    question: "What does a trie data structure store efficiently?",
    options: ["Numbers", "Strings/Prefixes", "Graphs", "Trees"],
    correct: 1,
    topic: "Data Structures"
  },
  {
    id: 39,
    question: "Time complexity of matrix chain multiplication using DP?",
    options: ["O(n²)", "O(n³)", "O(2ⁿ)", "O(n log n)"],
    correct: 1,
    topic: "Dynamic Programming"
  },
  {
    id: 40,
    question: "Which algorithm finds minimum spanning tree?",
    options: ["Dijkstra's", "Bellman-Ford", "Prim's", "Floyd-Warshall"],
    correct: 2,
    topic: "Graphs"
  },
  {
    id: 41,
    question: "What is the recurrence relation for merge sort?",
    options: ["T(n) = T(n-1) + n", "T(n) = 2T(n/2) + n", "T(n) = T(n/2) + 1", "T(n) = 2T(n-1) + 1"],
    correct: 1,
    topic: "Sorting"
  },
  {
    id: 42,
    question: "Which search is used in a sorted linked list?",
    options: ["Binary Search", "Linear Search", "Interpolation Search", "Jump Search"],
    correct: 1,
    topic: "Searching"
  },
  {
    id: 43,
    question: "What is the worst case of red-black tree operations?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correct: 1,
    topic: "Trees"
  },
  {
    id: 44,
    question: "Bellman-Ford handles which type of edges that Dijkstra cannot?",
    options: ["Undirected", "Weighted", "Negative weight", "Self loops"],
    correct: 2,
    topic: "Graphs"
  },
  {
    id: 45,
    question: "Time complexity of radix sort?",
    options: ["O(n log n)", "O(n²)", "O(d × (n + k))", "O(n)"],
    correct: 2,
    topic: "Sorting"
  },
  {
    id: 46,
    question: "What is memoization?",
    options: [
      "Storing results of subproblems",
      "Dividing problem into smaller parts",
      "Sorting before searching",
      "Using greedy choices"
    ],
    correct: 0,
    topic: "Dynamic Programming"
  },
  {
    id: 47,
    question: "Which data structure supports union and find operations?",
    options: ["Stack", "Queue", "Disjoint Set (Union-Find)", "Heap"],
    correct: 2,
    topic: "Data Structures"
  },
  {
    id: 48,
    question: "Number of nodes at level L in a binary tree?",
    options: ["L", "2L", "2^L", "L²"],
    correct: 2,
    topic: "Trees"
  },
  {
    id: 49,
    question: "What does the Master Theorem solve?",
    options: [
      "Graph shortest path",
      "Divide and conquer recurrences",
      "Dynamic programming problems",
      "Sorting optimality"
    ],
    correct: 1,
    topic: "Algorithms"
  },
  {
    id: 50,
    question: "Which technique solves the N-Queens problem?",
    options: ["Greedy", "Dynamic Programming", "Backtracking", "Divide and Conquer"],
    correct: 2,
    topic: "Algorithms"
  }
];

export function getRandomQuestions(count = 10) {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getAllQuestions() {
  return questions;
}

export default questions;
