import type { AnalysisResult } from "./schemas";

export const DEMO_PAPER_TEXT = `SOD-YOLOv10: Small Object Detection in Remote Sensing Images Based on YOLOv10

Abstract— YOLOv10, known for its efficiency in object detection methods, quickly and accurately detects objects in images. However, when detecting small objects in remote sensing imagery, traditional algorithms often encounter challenges like background noise, missing information, and complex multiobject interactions, which can affect detection performance. To address these issues, we propose an enhanced algorithm for detecting small objects, named SOD-YOLOv10. We design the Multidimensional Information Interaction for the Transformer Backbone (TransBone) Network, which enhances global perception capabilities and effectively integrates both local and global information, thereby improving the detection of small object features. We also propose a feature fusion technology using an attention mechanism, called aggregated attention in a gated feature pyramid network (AA-GFPN). This technology uses an efficient feature aggregation network and re-parameterization techniques to optimize information interaction between feature maps of different scales. Additionally, by incorporating the aggregated attention (AA) mechanism, it accurately identifies essential features of small objects. Moreover, we propose the adaptive focal powerful IoU (AFP-IoU) loss function, which not only prevents excessive expansion of the anchor box area but also significantly accelerates model convergence. To evaluate our method, we conduct thorough tests on the RSOD, NWPU VHR-10, VisDrone2019, and AI-TOD datasets. The findings indicate that our SOD-YOLOv10 model attains 95.90%, 92.46%, 55.61%, and 59.47% for mAP@0.5 and 73.42%, 66.84%, 39.03%, and 42.67% for mAP@0.5:0.95.

I. Introduction
WITH recent advances in the volume and quality of remote sensing imagery, object detection technology becomes central to automated analysis in this domain and is widely applied in both military and civilian fields such as precision agriculture, disaster relief, traffic monitoring, aerospace, urban planning, and geological environmental surveys. As deep neural network technology advances, object detection emerges as an important research area. Deep neural network-based object detection methods are generally divided into two categories: two-stage and one-stage approaches. Two-stage networks like Faster R-CNN and CNN produce proposal regions before classification and localization, suitable for applications requiring high precision. Conversely, one-stage networks such as SSD and YOLO immediately produce classifications and location coordinates, offering rapid processing speeds suitable for real-time detection scenarios.

Although YOLO algorithms are extensively applied in processing remote sensing images, their performance in detecting small objects against low-quality images, complex backgrounds, diverse object arrangements, and uncertain object orientations is often not ideal. To tackle these issues, as illustrated in Fig. 1, we propose an enhanced algorithm called SOD-YOLOv10, which integrates three core technologies: Transformer Backbone (TransBone) backbone network, aggregated attention in gated feature pyramid network (AA-GFPN) feature fusion technique, and adaptive focal powerful IoU (AFP-IoU) loss function, aimed to enhance the accuracy of detecting small objects in remote sensing imagery.

The primary contributions of this study include the following. 1) We propose a TransBone backbone network, which reorganizes certain channels to be distributed across the batch dimension and divides them into several sub-features to achieve cross-dimensional interaction. 2) We also propose the aggregated attention (AA)-GFPN feature fusion technique. 3) Furthermore, we propose the AFP-IoU loss function.

II. Methodology
The overall architecture of SOD-YOLOv10 follows the YOLOv10 paradigm, with three major improvements. The TransBone backbone is a multi-dimensional information interaction transformer that captures both local pixel details and global context. The AA-GFPN neck fuses multi-scale features through a gated feature pyramid network with aggregated attention. The AFP-IoU loss adds an adaptive penalty factor to accelerate convergence and prevent anchor box explosion.

III. Experiments
We evaluate SOD-YOLOv10 on RSOD, NWPU VHR-10, VisDrone2019, and AI-TOD datasets. On RSOD, our model achieves 95.90% mAP@0.5 and 73.42% mAP@0.5:0.95, outperforming the baseline YOLOv10 by 4.2%. On VisDrone2019, despite inherent dataset difficulty, our model still achieves competitive 55.61% mAP@0.5. Ablation studies demonstrate the complementary contributions of each module.

IV. Conclusion
We propose SOD-YOLOv10, which combines a TransBone backbone, an AA-GFPN neck, and an AFP-IoU loss to advance small object detection in remote sensing imagery. Experimental results on four benchmark datasets validate the effectiveness of the proposed method.`;

export const DEMO_ANALYSIS: AnalysisResult = {
  summary: {
    title:
      "SOD-YOLOv10: Small Object Detection in Remote Sensing Images Based on YOLOv10",
    authors: "Demo Authors (本结果为离线演示)",
    journal: "IEEE Geoscience and Remote Sensing Letters, Vol. 22, 2025",
    year: "2025",
    coreClaim:
      "通过集成 TransBone 骨干、AA-GFPN 特征融合与 AFP-IoU 损失三大模块，提升遥感图像中小目标检测的精度与速度",
    mainContributions: [
      "提出 TransBone 多维信息交互 Transformer 骨干网络",
      "提出 AA-GFPN 门控特征金字塔 + 聚合注意力融合机制",
      "提出 AFP-IoU 自适应焦点 IoU 损失函数",
    ],
    datasets: ["RSOD", "NWPU VHR-10", "VisDrone2019", "AI-TOD"],
    mainMetrics:
      "mAP@0.5: 95.90% / 92.46% / 55.61% / 59.47%；mAP@0.5:0.95: 73.42% / 66.84% / 39.03% / 42.67%",
    strengths: [
      "多数据集验证，覆盖典型遥感场景",
      "三模块协同设计，结构清晰",
      "系统化消融实验",
    ],
    weaknesses: [
      "VisDrone2019 / AI-TOD 上 mAP 偏低，泛化性论证不充分",
      "缺少对失败 case 的分析",
      "未与最新 SOTA 做充分对比",
    ],
  },
  sections: [
    {
      sectionId: "abstract",
      sectionTitle: "摘要",
      cards: [
        {
          type: "thesis",
          badge: "function",
          badgeText: "段落功能",
          title: "研究问题与解决方案概述",
          content:
            "<strong>段落角色：</strong>提出核心论点，构建研究框架<br><strong>问题：</strong>YOLOv10 在小目标检测上精度不足<br><strong>方案：</strong>SOD-YOLOv10 三大模块<br><strong>技术框架：</strong>TransBone + AA-GFPN + AFP-IoU",
        },
        {
          type: "evidence",
          badge: "logic",
          badgeText: "逻辑位置",
          title: "论证链：问题-方案-验证",
          content:
            "① 问题：YOLO 在遥感小目标检测中效果不佳<br>② 方案：三大模块协同解决<br>③ 验证：四个数据集的实验结果",
        },
        {
          type: "concession",
          badge: "technique",
          badgeText: "让步处理",
          title: "承认传统算法局限",
          content:
            "通过列举具体挑战（背景噪声、信息缺失、多目标交互）凸显本文方法的必要性",
        },
        {
          type: "evidence",
          badge: "weakness",
          badgeText: "潜在漏洞",
          title: "数据呈现方式",
          content:
            "四个数据集结果差异较大（mAP@0.5: 39.03%–95.90%），泛化性论证不充分",
        },
      ],
    },
    {
      sectionId: "introduction",
      sectionTitle: "I. 引言",
      cards: [
        {
          type: "concept",
          badge: "function",
          badgeText: "段落功能",
          title: "构建研究背景与论证框架",
          content:
            "应用场景：农业、救灾、交通、航天、城市规划、地质<br>技术分类：两阶段（高精度）vs 单阶段（实时性）<br>技术选择：YOLO 系列适合遥感实时检测",
        },
        {
          type: "evidence",
          badge: "logic",
          badgeText: "论证结构分析",
          title: "逻辑递进：铺垫-问题-方案",
          content:
            "① 重要性 → ② 技术发展 → ③ YOLO 优势 → ④ YOLO 局限 → ⑤ 本文方案",
        },
        {
          type: "concession",
          badge: "technique",
          badgeText: "关键让步处理",
          title: "承认 YOLO 方法的局限性",
          content:
            "低质量图像、复杂背景、多样目标排列、目标方向不确定等场景下表现不佳",
        },
        {
          type: "evidence",
          badge: "weakness",
          badgeText: "潜在漏洞",
          title: "论证薄弱点",
          content:
            "对 YOLO 局限的描述较为笼统；三个贡献点描述较长，核心创新点可能被淹没",
        },
      ],
    },
    {
      sectionId: "methodology",
      sectionTitle: "II. 方法论",
      cards: [
        {
          type: "method",
          badge: "function",
          badgeText: "段落功能",
          title: "整体架构与三大模块概述",
          content:
            "SOD-YOLOv10 沿用 YOLOv10 范式，三个主要改进点：<br>1. TransBone 多维信息交互 Transformer 骨干<br>2. AA-GFPN 门控特征金字塔 + 聚合注意力<br>3. AFP-IoU 自适应焦点 IoU 损失",
        },
        {
          type: "method",
          badge: "technique",
          badgeText: "技术细节",
          title: "TransBone 骨干网络",
          content:
            "在 batch 维度重排部分通道并切分为子特征，实现跨维交互；同时动态调整卷积核权重，融合局部与全局信息",
        },
        {
          type: "method",
          badge: "technique",
          badgeText: "技术细节",
          title: "AA-GFPN 特征融合",
          content:
            "高层语义信息通过 top-down 通路融合多级特征；引入 AA 注意力机制增强对小目标的关注",
        },
        {
          type: "method",
          badge: "technique",
          badgeText: "技术细节",
          title: "AFP-IoU 损失函数",
          content:
            "通过自适应惩罚因子和梯度调整机制，避免 anchor 过度扩张并加速模型收敛",
        },
      ],
    },
    {
      sectionId: "experiments",
      sectionTitle: "III. 实验",
      cards: [
        {
          type: "evidence",
          badge: "function",
          badgeText: "段落功能",
          title: "实验设计概述",
          content:
            "在 RSOD、NWPU VHR-10、VisDrone2019、AI-TOD 四个数据集上系统评估；含消融实验",
        },
        {
          type: "evidence",
          badge: "logic",
          badgeText: "数据呈现",
          title: "关键实验结果",
          content:
            "RSOD: mAP@0.5=95.90%, mAP@0.5:0.95=73.42%（较 YOLOv10 baseline +4.2%）<br>VisDrone2019: mAP@0.5=55.61%（数据集难度大，仍具竞争力）",
        },
        {
          type: "concession",
          badge: "weakness",
          badgeText: "潜在漏洞",
          title: "实验局限性",
          content:
            "缺少与最新 SOTA 的直接对比；未提供失败 case 分析；VisDrone2019 与 AI-TOD 上绝对值仍偏低",
        },
      ],
    },
    {
      sectionId: "conclusion",
      sectionTitle: "IV. 结论",
      cards: [
        {
          type: "thesis",
          badge: "function",
          badgeText: "段落功能",
          title: "全文总结",
          content:
            "提出 SOD-YOLOv10，结合 TransBone + AA-GFPN + AFP-IoU 提升小目标检测性能；四个数据集验证有效性",
        },
        {
          type: "concession",
          badge: "weakness",
          badgeText: "潜在漏洞",
          title: "结论的局限",
          content:
            "未讨论方法论的局限性；未提出具体未来研究方向；学术坦诚度较弱",
        },
      ],
    },
  ],
};
