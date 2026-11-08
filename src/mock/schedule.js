let nextId = 1

function course(course_name, teacher, location, weekday, start_section, end_section, extra = {}) {
  return {
    id: nextId++,
    course_name,
    teacher,
    location,
    weekday,
    start_section,
    end_section,
    start_week: 1,
    end_week: 16,
    week_type: 0,
    semester: '2026-1',
    ...extra,
  }
}

export const mockSchedules = [
  course('微服务架构技术', '冯建浩', 'T11-106(AI实验室)', 1, 1, 2),
  course('网络与信息安全', '王书静', 'T07-304(多媒体教室)', 1, 7, 8),
  course('嵌入式系统与应用', '张强', 'T12-312 计算机科学与技术实验室', 1, 11, 13),

  course('大模型原理与应用', '邢飞亚', 'T11-106(AI实验室)', 2, 1, 2),
  course('NoSQL 数据库技术', '宋小浩', 'T11-307(公共机房)', 2, 5, 6),
  course('算法设计与分析', '李国政', 'T05-301(多媒体教室)', 2, 7, 8),
  course('就业指导', '唐悦恒', 'T14-304(多媒体教室)', 2, 9, 10),

  course('软件工程', '赵浩翔', 'T12-302 软件工程专业实验室', 3, 1, 2),
  course('计算机网络', '张雨', 'T06-104(多媒体教室)', 3, 3, 4),
  course('微服务架构技术', '冯建浩', 'T11-106(AI实验室)', 3, 11, 12),

  course('微服务架构技术', '冯建浩', 'T11-106(AI实验室)', 4, 3, 4),
  course('Web 前端框架技术', '桑国岭', 'T11-305(公共机房)', 4, 5, 5),
  course('Web 前端框架技术', '桑国岭', 'T11-305(公共机房)', 4, 6, 6),
  course('软件工程', '赵浩翔', 'T10-103(多媒体教室)', 4, 7, 8),

  course('计算机网络', '张雨', 'T12-301 计算机网络实验室', 5, 1, 2),
  course('Web 前端框架技术', '桑国岭', 'T11-305(公共机房)', 5, 3, 4),
  course('计算机图形学', '赵梅琦', 'T12-306 区块链工程专业实验室', 5, 5, 6),
  course('微服务架构技术', '冯建浩', 'T11-106(AI实验室)', 5, 7, 8),
]
